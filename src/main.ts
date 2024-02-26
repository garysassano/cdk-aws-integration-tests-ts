import { Aspects, App } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import { CdkIntegTestsDemoStack } from "./stacks/cdk-integ-tests-demo-stack";

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();
// Add the cdk-nag AwsSolutions Pack with extra verbose logging enabled.
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

new CdkIntegTestsDemoStack(app, "ApplicationStack", {
  env: devEnv,
  setDestroyPolicyToAllResources: true,
});

app.synth();
