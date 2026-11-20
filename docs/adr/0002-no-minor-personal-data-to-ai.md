# No personal information about a Minor is sent to the AI

OpenAI's API Business Terms forbid sending personal information of children under 13 without zero data retention, and its under-18 guidance asks for safeguards for minors. So prompts describe a Minor only by an alias ("Child A") and a coarse audience ("children's wardrobe"), plus descriptions of their clothes; their name, age, colouring, measurements and notes never leave our servers. Colour fit for a Minor is still applied, by the deterministic code in `src/lib/personal`, which involves no AI. All prompt text about a Person is built in one place, `promptSubject()` in `src/lib/people/subject.ts`, and its tests prove the rule.

We considered requesting zero data retention from OpenAI and sending children's traits (rejected for now: it depends on an approval outside our control and the benefit is small) and blocking Minors from AI features entirely (rejected: clothing descriptions carry no personal information and families want outfits for their children).

Children never sign in: a parent or legal guardian creates and manages them, after confirming that role. The FTC's COPPA FAQ says COPPA does not cover information collected from parents about their children; this is a product decision, not legal advice.

## Consequences

- A Minor's own preferences (styles, formality) and the Family's home town are also kept out of prompts that are about the Minor; the AI gets a fixed "practical, age-appropriate everyday clothes" line and no location label.
- Text a parent types (a piece's name or description, Today's notes, a stylist message, a trip destination) is sent as typed. The app cannot reliably detect a name in free text, so wherever a parent types for a child it asks them not to include names, ages or schools. This is the remaining gap; zero data retention would close it.

Sources: https://openai.com/policies/business-terms · https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance · https://www.ftc.gov/tips-advice/business-center/guidance/complying-coppa-frequently-asked-questions
