# AWS Costs and Teardown

## Policy

- **Do not deploy** chargeable resources without explicit owner approval.
- CDK `deploy` script is hard-gated to fail by default.
- Prefer on-demand DynamoDB, short log retention, no always-on EC2/ECS/RDS.

## Stack contents (when deployed)

| Resource | Cost posture |
|----------|--------------|
| DynamoDB on-demand | Pay per request; demo traffic typically cents–low dollars |
| Lambda 256MB | Pay per invoke; hackathon demos usually negligible |
| API Gateway HTTP API | Pay per request |
| Cognito User Pool | Free tier usually covers demos |
| CloudWatch Logs (7-day retention) | Keep volume low; never log secrets |
| Bedrock | Pay per token — keep `BEDROCK_ENABLED=false` until needed |
| AWS Budget | Alert at 80% of **$25/month** (set `budgetEmail` context) |

## Estimated sandbox assumption

Single-developer demo for a few days with Bedrock off: typically **under $5**, often near free-tier. Bedrock experimentation can exceed that quickly — monitor budget email.

## Deploy (owner-approved only)

```bash
# Prerequisites: AWS CLI configured, CDK bootstrapped
./.tools/pnpm-bin --filter @familyflow/api build
cd infra
npx cdk synth
npx cdk deploy FamilyFlowSandbox -c budgetEmail=you@example.com
```

## Teardown

```bash
cd infra
npx cdk destroy FamilyFlowSandbox
# Confirm Cognito/DynamoDB/API/Lambda removed in console
# Disable Bedrock model access if enabled solely for this project
```

## Local alternatives (no AWS spend)

- `FAMILYFLOW_STORE=memory` (default) — real state machine in-process
- DynamoDB Local via Docker — real DynamoDB protocol, no AWS bill
