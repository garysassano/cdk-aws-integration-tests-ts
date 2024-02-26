import { awscdk, javascript } from "projen";
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: "2.133.0",
  defaultReleaseBranch: "main",
  depsUpgradeOptions: { workflow: false },
  eslint: true,
  experimentalIntegRunner: true,
  minNodeVersion: "20.11.1",
  name: "cdk-aws-integration-tests-ts",
  packageManager: javascript.NodePackageManager.PNPM,
  pnpmVersion: "8.15.5",
  prettier: true,
  projenrcTs: true,

  deps: ["cdk-nag", "@aws-sdk/client-dynamodb", "@types/aws-lambda"],
});
project.synth();
