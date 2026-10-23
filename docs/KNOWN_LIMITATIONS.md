# Known Limitations

Honest list of unverified or incomplete capabilities. **Do not claim these work in demos.**

| Limitation | Impact | Mitigation / next action |
|------------|--------|--------------------------|
| No AWS credentials / CLI on this host | Cannot run live Cognito, API Gateway, DynamoDB, Bedrock | Owner installs AWS CLI, configures account, approves deploy |
| Vega SDK / VVD not installed on build host | Cannot record official Fire TV/Vega simulator video here | Install VDT per TESTING_FIRE_TV_VEGA_ALEXA.md; port RN-TV app |
| Browser TV shell ≠ Vega OS | Hackathon/Appstore video must use VVD or device | Keep shell for API testing only |
| Alexa Developer Console unexecuted | Account linking needs `ask configure` + Cognito | Follow AMAZON_PUBLISH_GUIDE.md |
| Alexa+ MCP is preview | Not a full Alexa+ partner certification | Wire per current Amazon Alexa+ docs |
| Bedrock off by default | AI uses curated library until enabled | BEDROCK_SETUP.md + model access |
| Local Bearer auth | Not production identity | Disable in AWS (`ALLOW_LOCAL_DEV_AUTH=false`) |
| Bedrock default off | AI suggestions use curated library | Enable after model access + cost approval |
| Playwright E2E missing | Dashboard not browser-automated yet | Add Playwright suite (step 26) |
| Physical Fire TV absent | Cannot do device fidelity testing | VVD interim; device before Appstore |
| Email SNS alerts optional | In-app polling first | Wire SNS after deploy if needed |
| No COPPA/legal certification | Cannot onboard real children | External legal/privacy review |
| CDK Bedrock IAM uses broad invoke | Should scope to model ARN | Tighten after region/model chosen |
| Weekly planner day assignments | Stored in browser localStorage only | Acceptable for hackathon; not server schedule |

## What *is* claimed working (local)

- Household → child → pair → request → parent approve → complete → points once → audit
- Automated domain + API vertical-slice tests
- Parent dashboard against local API
- Alexa local intent simulator against local API
