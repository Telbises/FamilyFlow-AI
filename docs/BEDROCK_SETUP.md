# Amazon Bedrock setup for FamilyFlow

FamilyFlow uses Bedrock to generate **parent-reviewable** adventure plans as strict JSON. Children never freeform-chat with the model. If Bedrock is off or fails, the **curated library** is used and labeled.

## 1. Enable model access

1. Sign in to AWS Console → Amazon Bedrock → Model access.  
2. Request access for a Converse-compatible model in your region (example default in code: `amazon.nova-lite-v1:0` in `us-east-1`).  
3. Confirm the model ID is available in your account/region (IDs change — verify in console).

## 2. Deploy or configure env

```bash
export BEDROCK_ENABLED=true
export BEDROCK_REGION=us-east-1
export BEDROCK_MODEL_ID=amazon.nova-lite-v1:0   # or your approved model
export FAMILYFLOW_MODE=aws
export ALLOW_LOCAL_DEV_AUTH=false
```

CDK Lambda already includes `bedrock:Converse` / `InvokeModel` (narrow to model ARN when you know it).

## 3. Parent dashboard flow

1. Settings → ensure AI feature flag is on.  
2. Weekly planner → **Suggest an adventure**.  
3. Response is labeled `AI-generated` or `Curated fallback`.  
4. Mission enters library as `available` but **child play still needs request + parent approval**; completion rewards need a second parent decision.

## 4. Safety controls (already in code)

- Zod schema: title, ageBands, minutes, materials, steps, safetyNotes, `parentApprovalRequired: true`  
- Deny-list: weapons, purchases, location sharing, dangerous dares  
- No child display names in the Bedrock prompt by default  
- Audit event `mission.generated` with `origin` metadata (no secrets)

## 5. Cost

Bedrock is pay-per-token. Keep `BEDROCK_ENABLED=false` until demo day if budget-constrained. Budget alarm in CDK defaults to $25/month.

## 6. Local without AWS

```bash
BEDROCK_ENABLED=false
# generate endpoint uses curated-missions/library.json
```
