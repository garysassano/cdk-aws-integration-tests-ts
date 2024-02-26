import path from "path";
import {
  Aspects,
  CfnResource,
  Duration,
  IAspect,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import {
  Role,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Key } from "aws-cdk-lib/aws-kms";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Topic } from "aws-cdk-lib/aws-sns";
import { SqsSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct, IConstruct } from "constructs";

interface CdkIntegTestsDemoStackProps extends StackProps {
  /**
   * Whether to set all removal policies to DESTROY
   */
  setDestroyPolicyToAllResources?: boolean;
}

/**
 * The demo application stack defining a serverless data enrichment stack
 */
export class CdkIntegTestsDemoStack extends Stack {
  public readonly topicArn: string;
  public readonly tableName: string;
  public readonly kmsKeyArn: string;
  public readonly functionName: string;

  constructor(
    scope: Construct,
    id: string,
    props?: CdkIntegTestsDemoStackProps,
  ) {
    super(scope, id, props);

    // KMS key for server-side encryption
    const kmsKey = new Key(this, "KmsKey", {
      enableKeyRotation: true,
    });
    this.kmsKeyArn = kmsKey.keyArn;

    // SNS topic
    const snsTopic = new Topic(this, "Topic", {
      masterKey: kmsKey,
    });
    this.topicArn = snsTopic.topicArn;

    // SQS queue with a dead letter queue
    const dlq = new Queue(this, "Dlq", {
      enforceSSL: true,
    });

    const sqsQueue = new Queue(this, "Queue", {
      enforceSSL: true,
      deadLetterQueue: {
        maxReceiveCount: 2,
        queue: dlq,
      },
    });

    // DynamoDB table
    const table = new Table(this, "Table", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });
    this.tableName = table.tableName;

    // Lambda function
    const functionName = `integ-lambda-${this.stackName}`;

    // The lambda function's log group
    const logGroup = new LogGroup(this, "LogGroup", {
      logGroupName: `/aws/lambda/${functionName}`,
    });

    // The Lambda function's role with logging permissions
    const lambdaRole = new Role(this, "Role", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      inlinePolicies: {
        logging: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
              ],
              resources: [logGroup.logGroupArn],
            }),
          ],
        }),
      },
    });

    // The lambda enricher function
    const enricherFunction = new NodejsFunction(this, "EnricherLambda", {
      functionName: functionName,
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "..", "functions", "sqs-ddb", "index.ts"),
      timeout: Duration.seconds(30),
      environment: {
        TABLE_NAME: table.tableName,
      },
      role: lambdaRole,
    });
    this.functionName = enricherFunction.functionName;

    // Allow Lambda to write data to the DynamoDB table
    table.grantWriteData(enricherFunction);

    // SQS Queue subscribes to SNS
    snsTopic.addSubscription(new SqsSubscription(sqsQueue));

    // Lambda is triggered by SQS
    enricherFunction.addEventSource(new SqsEventSource(sqsQueue));

    // If Destroy Policy Aspect is present:
    if (props?.setDestroyPolicyToAllResources) {
      Aspects.of(this).add(new ApplyDestroyPolicyAspect());
    }
  }
}

/**
 * Aspect for setting all removal policies to DESTROY
 */
class ApplyDestroyPolicyAspect implements IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      node.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }
  }
}
