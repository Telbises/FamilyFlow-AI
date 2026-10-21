#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { FamilyFlowStack } from "../lib/familyflow-stack";

const app = new cdk.App();

new FamilyFlowStack(app, "FamilyFlowSandbox", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
  description: "FamilyFlow AI low-cost sandbox (hackathon) — deploy only with owner approval",
});
