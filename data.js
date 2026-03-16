// ============================================================
// WARRIORBABE SALES OPS — DATA LAYER (Complete)
// ============================================================

window.WB = {};

// ============================================================
// WORKFLOWS
// ============================================================
WB.workflows = [

  // ──────────── GLOBAL ────────────
  {
    id: "1751491745",
    name: "Global — Big Brain — Meetings Tool Sync",
    engine: "global",
    status: "enabled",
    objectType: "Contact",
    enrollmentType: "Manual enrollment (re-enrollable)",
    description: "The master brain of the entire booking system. Every time a meeting is created via Calendly or HubSpot Meetings, this workflow fires to read the booking, determine the meeting type, create/update Appointment records, move deal stages, set Zoom links, send Slack notifications, and validate the lead's phone number. It is the central nervous system connecting Calendly → HubSpot → Slack → n8n.",
    whyItMatters: "Without this workflow, a booking would just be a calendar event. This is what makes HubSpot 'know' about the meeting, assigns reps, creates the deal, and alerts the team in real time.",
    nodes: [
      { num: "1", type: "filter", action: "Enrollment Trigger", detail: "Contact is manually enrolled (or re-enrolled). Re-enrollment is ON, so it fires every time a new meeting is created for the same contact." },
      { num: "2", type: "branch", action: "Branch: What type of meeting was booked?", detail: "Reads 'Meeting Type of Last Booking'. Routes to one of 4 branches: Setter Call, Closer Call, Closer Follow Up, or Setter Follow Up." },
      { num: "3", type: "code", action: "Custom Code: Find Last Meeting + External ID", detail: "Searches HubSpot Meetings API for the most recently created meeting. Reads its 'hs_unique_id' and outputs it as 'external_id'. Secret: Fluffy_Timezone. (Appears 4× — one per branch.)" },
      { num: "4", type: "create", action: "Create Appointment Record", detail: "Creates a new Appointment object linked to both the Contact and the Deal. Sets Meeting Type, Start Time, Zoom link, and the external calendar event ID." },
      { num: "5", type: "update", action: "Update Deal Stage", detail: "Moves the deal to the correct stage: 'Setter Call Booked', 'Closing Call Booked', 'Closing Follow Up Call Booked', or 'Setter Follow Up Call Booked'." },
      { num: "6", type: "update", action: "Set Contact Properties", detail: "Writes the correct Zoom link, last booked datetime, and booking method to the Contact record." },
      { num: "7", type: "code", action: "Timezone Formatter (×2)", detail: "Converts appointment time to a human-readable EST format for Slack messages. Uses 'access_token' secret." },
      { num: "8", type: "code", action: "Phone Validation via ClearoutPhone API", detail: "Calls the ClearoutPhone API with the contact's mobile number. Returns line type (Mobile/Landline/VoIP) and validity result. Secret: clearoutphone." },
      { num: "9", type: "slack", action: "Slack Notification → #confirmation-channel (C0ADDPT64BE)", detail: "Posts full booking alert: Closer name, Setter name, Lead name, email, phone, line type, validation result, LT purchased?, LT purchase date. Contains 'Claim Confirmation' button and 'Go to Appointment' link." },
      { num: "10", type: "webhook", action: "Webhook → n8n (Setter Ads Confirmation)", detail: "Fires POST to https://n8n.warriorbabe.com/webhook/setter-ads-confirmation. Used for downstream ad attribution and confirmation tracking." },
      { num: "11", type: "update", action: "Clear Calendly URI Properties", detail: "Clears 'calendly_scheduled_event_uri' and 'calendly_event_type_uri' from Contact after use, so the next booking starts fresh." },
      { num: "12", type: "update", action: "Set 'Currently In Deal Creation' → No", detail: "Resets this flag at the end of ALL branches so the Calendly Error Handler knows the workflow completed successfully." }
    ]
  },
  {
    id: "1782413973",
    name: "Calendly Booking Error Handler",
    engine: "global",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "Event-based: Meeting created",
    description: "A safety net that fires whenever a meeting is created. If after 3 minutes the 'calendly_scheduled_event_uri' is still blank AND 'currently_in_deal_creation' is still Yes, Zapier failed. The workflow calls Calendly API directly to retrieve the most recent booking URI. If that also fails, it sends a Slack DM to the operations manager.",
    whyItMatters: "Zapier occasionally drops webhooks. This prevents lost bookings from falling through the cracks and ensures the Big Brain workflow always has the data it needs.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: Meeting created on Contact", detail: "Fires whenever a new meeting object is associated with a contact." },
      { num: "2", type: "delay", action: "Wait 3 minutes", detail: "Gives Zapier time to complete its normal flow. If Zapier succeeds, the check below passes and the workflow exits cleanly." },
      { num: "3", type: "filter", action: "Check: Is Calendly URI blank AND currently_in_deal_creation = Yes?", detail: "Only proceeds if BOTH conditions are true — meaning the normal flow failed." },
      { num: "4", type: "code", action: "Call Calendly API", detail: "GET request to Calendly's API using org: EDFFFZ67N5KHDG76 and Secret: Calendly_Token. Searches for the latest scheduled event for this contact's email." },
      { num: "5", type: "code", action: "Fetch Invitee Details", detail: "Uses the event URI from step 4 to fetch full invitee details, extracting both URI properties." },
      { num: "6", type: "update", action: "Write URIs to Contact", detail: "Writes both URIs to the Contact record so the Big Brain workflow can proceed." },
      { num: "7", type: "slack", action: "DM Operations Manager if Still Failing", detail: "If Calendly API also fails, sends DM to U0A0YC606UE with contact name, email, and error details for manual resolution." }
    ]
  },

  // ──────────── SETTER ENGINE ────────────
  {
    id: "1749323893",
    name: "Entry Point Mapping — Opt-in Forms",
    engine: "setter",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "Form submission (Forms: f8038df7, 6e825c36)",
    description: "The first workflow a lead enters when they submit an opt-in form. Sets the lifecycle stage to Lead, adds the contact to the correct funnel lists, sets Lead Status to NEW, stamps the last opt-in timestamp, sends a Slack alert, and enrolls the contact in the Delegation workflow.",
    whyItMatters: "This is the 'welcome mat' of the entire system. Without it, new leads would have no lifecycle stage, no list membership, no Lead Status, and the team would never be notified.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: Form submitted", detail: "Contact submits one of the opt-in forms (IDs: f8038df7 or 6e825c36)." },
      { num: "2", type: "update", action: "Set Lifecycle Stage → Lead", detail: "Stamps the contact as a proper Lead in the HubSpot funnel." },
      { num: "3", type: "update", action: "Add to Lists", detail: "Adds to List 2079 (All Opt-ins), List 2173 (VSL Funnel), or List 2174 (Quiz Funnel) depending on which form was submitted." },
      { num: "4", type: "update", action: "Set Lead Status → NEW", detail: "Triggers setter Smart Views to surface the lead in P1 (New Hot Leads)." },
      { num: "5", type: "update", action: "Set Last Opt-in Timestamp", detail: "Writes current date/time to 'last_optin_timestamp'. Used to calculate Speed to Lead and identify the current marketing cycle." },
      { num: "6", type: "slack", action: "Slack Alert → #new-leads channel (C0A8Q4H7X6E)", detail: "Posts a new lead notification to the team so setters know to prioritize dialing." },
      { num: "7", type: "enroll", action: "Enroll in 'Delegation Date/Time Stamp' Workflow", detail: "Triggers the next workflow (ID: 1749317019) to stamp the exact delegation time within business hours." }
    ]
  },
  {
    id: "1749317019",
    name: "Delegation Date/Time Stamp",
    engine: "setter",
    status: "enabled",
    objectType: "Contact",
    enrollmentType: "Manual enrollment",
    description: "Stamps the exact date and time a lead was delegated to a setter, but only during business hours (Mon–Sun 6:30am–8:00pm). If a lead opts in at 11pm, the stamp is delayed until 6:30am the next day so Speed to Lead calculations reflect actual working hours.",
    whyItMatters: "Speed to Lead is a critical KPI. Without business-hours awareness, a setter would appear slow for not calling a lead at 2am. This ensures fairness and accuracy in STL reporting.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: Manual enrollment", detail: "Enrolled by the Entry Point Mapping workflow after form submission." },
      { num: "2", type: "branch", action: "Branch: VSL or Quiz funnel?", detail: "Checks List membership: List 2173 = VSL, List 2174 = Quiz. Routes to funnel-specific delay window." },
      { num: "3", type: "delay", action: "Wait 1 minute (inside business hours window)", detail: "Short delay to let contact properties settle before stamping." },
      { num: "4", type: "update", action: "Set 'lead_delegated_datetime_stamp'", detail: "Writes the current timestamp. Time window enforced: Mon–Sun 6:30am–8:00pm EST." }
    ]
  },
  {
    id: "1782834331",
    name: "Appointments Delegation",
    engine: "setter",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "List-based: Contact has an associated Appointment",
    description: "When a new appointment is created for a contact, this workflow automatically assigns a Confirmation Owner using round-robin logic from team 15910337. It then updates the Confirmation Owner property on the Appointment record and sends a Slack alert.",
    whyItMatters: "Without automated round-robin assignment, appointments would sit unclaimed and leads would go unconfirmed, destroying show rates.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: Contact has associated Appointment (assoc type 907)", detail: "Fires when a new Appointment object is linked to the contact." },
      { num: "2", type: "update", action: "Round-Robin Assignment", detail: "Assigns the next available rep from team 15910337 as the Confirmation Owner." },
      { num: "3", type: "update", action: "Set 'confirmation_owner' on Appointment", detail: "Writes the assigned rep to the Appointment record (association type 48)." },
      { num: "4", type: "slack", action: "Slack Alert → #delegation channel (C0A8Q4H7X6E)", detail: "Notifies the team that a new appointment has been claimed and assigned." }
    ]
  },
  {
    id: "1748739678",
    name: "Setter Engine — Call Time Range Stamp",
    engine: "setter",
    status: "disabled",
    objectType: "Call",
    enrollmentType: "Call object created/updated",
    description: "Fires on every outbound Call object. Converts the call timestamp to EST and buckets it into a 2-hour range (e.g. '7am–9am'). Writes the bucket to 'call_date_range_est' on the Call record.",
    whyItMatters: "Allows the dashboard to show which time ranges produce the most connects and bookings, so setters can prioritize their dial sessions.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: Call object created", detail: "Fires when Aloware/HubSpot logs a new call." },
      { num: "2", type: "update", action: "Convert 'hs_timestamp' to EST", detail: "Reads the raw call timestamp and converts timezone to US/Eastern." },
      { num: "3", type: "branch", action: "Branch: Which 2-hour window?", detail: "8 branches: 7am–9am, 9am–11am, 11am–1pm, 1pm–3pm, 3pm–5pm, 5pm–7pm, 7pm–9pm, 9pm–11pm (+ overnight catch-all)." },
      { num: "4", type: "update", action: "Set 'call_date_range_est'", detail: "Writes the matching range label to the Call object for dashboard grouping." }
    ]
  },
  {
    id: "1758128504",
    name: "Speed To Lead — First Touch Group Stamp",
    engine: "setter",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "Event-based: sm__number_of_outbound_calls > 1",
    description: "After the first outbound call is logged, calculates the Speed to Lead duration and stamps the contact into one of 5 buckets: <30 min, <2 hours, <24 hours, 24–48 hours, or 48+ hours.",
    whyItMatters: "The bucket stamp feeds the Speed to Lead donut chart on the dashboard, showing what percentage of leads are being called within 30 minutes vs. later.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: sm__number_of_outbound_calls becomes > 1", detail: "Fires after the second call is logged." },
      { num: "2", type: "branch", action: "Branch: What is the 'speed_to_lead' value?", detail: "Checks the calculated Speed to Lead duration and routes to the matching bucket." },
      { num: "3", type: "update", action: "Set 'sm__speed_to_lead_range_stamp'", detail: "Writes the bucket label: 'Less than 30 Mins', 'Less Than 2 Hours', 'Less Than 24 Hours', 'Between 24–48 Hours', or 'More than 72 Hours'." }
    ]
  },
  {
    id: "1748780945",
    name: "Setter Engine — Lead Refresh",
    engine: "setter",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "Manual enrollment",
    description: "Sets 'lead_refresh_active = true', temporarily removing the lead from Smart View priority lists for 120 minutes. After the delay, clears the flag so the lead re-appears. Prevents setters from repeatedly dialing the same lead back-to-back.",
    whyItMatters: "Enforces a natural call cadence without needing manual list management. Prevents setter burnout and lead harassment.",
    nodes: [
      { num: "1", type: "update", action: "Set 'lead_refresh_active' → true", detail: "Immediately hides the lead from Smart View (Smart Views filter: lead_refresh_active ≠ Yes)." },
      { num: "2", type: "delay", action: "Wait 120 minutes", detail: "Standard cooldown period. Advanced Logic version uses age-based delays instead." },
      { num: "3", type: "update", action: "Clear 'lead_refresh_active'", detail: "Removes the flag so the lead reappears in Smart View for the next dial session." }
    ]
  },
  {
    id: "1748780320",
    name: "Setter Engine — Lead Refresh with Advanced Logic",
    engine: "setter",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "Manual enrollment",
    description: "Advanced version using the lead's age (time since opt-in) to set a dynamic cooldown. Newer leads get shorter cooldowns; older leads get longer ones — ensuring fresh leads are re-surfaced quickly while older leads aren't spammed.",
    whyItMatters: "Treats new leads with urgency while being respectful of older leads. More sophisticated than the basic Lead Refresh.",
    nodes: [
      { num: "1", type: "update", action: "Set 'lead_refresh_active' → true", detail: "Hides the lead from Smart Views immediately." },
      { num: "2", type: "branch", action: "Branch: How old is the lead?", detail: "4 branches by time since opt-in: <24 hours → 30 min; 24–48 hours → 120 min; 48–72 hours → 240 min; 72+ hours → 480 min." },
      { num: "3", type: "delay", action: "Wait (dynamic delay per branch)", detail: "30 / 120 / 240 / 480 minutes depending on branch." },
      { num: "4", type: "update", action: "Clear 'lead_refresh_active'", detail: "Lead reappears in Smart Views after the cooldown." }
    ]
  },
  {
    id: "1749341048",
    name: "Speed To Lead — Datetime Time Stamp",
    engine: "setter",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "Event-based: sm__number_of_outbound_calls = 1",
    description: "Fires on the very first outbound call to a lead. Stamps the current datetime to 'sm__first_outbound_call_date'. This is the 'clock stop' that finalizes the Speed to Lead calculation.",
    whyItMatters: "Speed to Lead can only be calculated once the first call time is known. This workflow captures that exact moment.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: sm__number_of_outbound_calls = 1 (first call)", detail: "Only fires for the very first dial — enrollment is NOT re-enrollable." },
      { num: "2", type: "update", action: "Set 'sm__first_outbound_call_date'", detail: "Timestamps the first call. Speed to Lead = First Outbound Date − Lead Delegated Date." }
    ]
  },
  {
    id: "1748363913",
    name: "Universal Call Tracker",
    engine: "setter",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "Event-based: Outbound call logged with disposition",
    description: "Fires every time an outbound call is logged with a disposition. Updates 'sm__last_outbound_call_date' and increments 'sm__number_of_outbound_calls' by 1. This is the counter used by all Speed to Lead and call activity workflows.",
    whyItMatters: "All call activity reporting, Speed to Lead bucketing, and daily dial volume KPIs depend on this counter being accurate.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: Outbound call with disposition logged", detail: "Event-based — fires for every dial regardless of outcome." },
      { num: "2", type: "update", action: "Set 'sm__last_outbound_call_date' → now", detail: "Keeps a rolling timestamp of when the contact was last dialed." },
      { num: "3", type: "update", action: "Increment 'sm__number_of_outbound_calls' + 1", detail: "Running total of all dials. #1 input for speed-to-lead and call volume reports." }
    ]
  },
  {
    id: "1745555346",
    name: "SM Setter Engine — Lead Status Big Brain",
    engine: "setter",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "Property change: hs_lead_status updated",
    description: "Monitors lead status changes. When Lead Status becomes 'IN_PROGRESS', automatically upgrades the lifecycle stage to Sales Qualified Lead (SQL). Ensures lifecycle stage always reflects the actual qualification state.",
    whyItMatters: "Lifecycle stage drives lifecycle reporting and list membership. Without this, a lead could be 'In Progress' but still show as a raw 'Lead' in lifecycle reports.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: hs_lead_status changes", detail: "Fires whenever Lead Status is updated." },
      { num: "2", type: "branch", action: "Branch: Is Lead Status = IN_PROGRESS?", detail: "Only continues if the new value is IN_PROGRESS." },
      { num: "3", type: "update", action: "Set Lifecycle Stage → salesqualifiedlead (SQL)", detail: "Upgrades the funnel stage from Lead/MQL to SQL." }
    ]
  },
  {
    id: "1747352986",
    name: "SM — Global Meetings Tool Sync",
    engine: "setter",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "Property change: meeting_type_of_last_booking",
    description: "Legacy sync workflow. When 'meeting_type_of_last_booking' is updated, branches on meeting type and sets the appropriate lifecycle stage and deal stage. Supplementary to the Big Brain workflow.",
    whyItMatters: "Legacy fallback ensuring meeting type changes also trigger lifecycle/deal stage updates.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: meeting_type_of_last_booking changes", detail: "Event-based on the booking type property." },
      { num: "2", type: "branch", action: "Branch: Which meeting type?", detail: "Routes to WB-specific path or standard path." },
      { num: "3", type: "update", action: "Set Lifecycle Stage (SQL or MQL)", detail: "WB Assessment → SQL; Standard Assessment → MQL." },
      { num: "4", type: "update", action: "Set Deal Stage → Closing Call Booked", detail: "Moves the deal to the Closing Call Booked stage (ID: 1249249111)." }
    ]
  },
  {
    id: "1747852923",
    name: "PQL Helper Workflow (Adding To List)",
    engine: "setter",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "LT Purchase object in stage 1250223267 created today",
    description: "When a Low-Ticket (LT) purchase object is created in the 'completed purchase' stage, this workflow adds the associated contact to List 2170 (PQL — Product Qualified Leads). Signals that this lead has bought something and should be prioritized.",
    whyItMatters: "LT purchasers are dramatically higher-intent leads. This list membership unlocks separate Smart View priority, ensuring setters call buyers first.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: LT Purchase object in stage 1250223267 created today", detail: "Listens for completed low-ticket purchase events." },
      { num: "2", type: "update", action: "Add Contact to List 2170 (PQL)", detail: "Flags the associated contact as a Product Qualified Lead for priority dialing." }
    ]
  },
  {
    id: "1744092087",
    name: "SM — Lifecycle MQL Router (Application)",
    engine: "setter",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "Form submission: Form 95ebd1b1",
    description: "When a lead submits the application form, reads their stated investment amount and routes them. Leads who can invest $1,000+ are set to MQL. Leads under $1,000 are marked UNQUALIFIED.",
    whyItMatters: "Qualification at the form level saves setter time by automatically filtering out price-misaligned leads before they enter the dialing queue.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: Application form submitted (Form 95ebd1b1)", detail: "Fires when the multi-step application is completed." },
      { num: "2", type: "branch", action: "Branch: Investment Amount?", detail: "<$1k → UNQUALIFIED. $1k–$5k / $5k–$10k / $10k–$20k / $20k+ → MQL." },
      { num: "3", type: "update", action: "Set Lifecycle Stage (MQL or UNQUALIFIED)", detail: "MQL leads enter setter queue. Unqualified leads are excluded." }
    ]
  },
  {
    id: "1744065923",
    name: "SM — Lifecycle PQL Router (LT Purchase)",
    engine: "setter",
    status: "disabled",
    objectType: "LT Purchase Object",
    enrollmentType: "LT Purchase enters stage 1250223267",
    description: "When an LT Purchase object reaches the 'completed' stage, this workflow timestamps the purchase date on the Contact and sets the contact's lifecycle stage to PQL (Product Qualified Lead). Links via association type 19.",
    whyItMatters: "PQL is the highest-intent lifecycle stage before SQL. Buyer contacts need to be immediately identifiable in the system so they receive priority treatment.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: LT Purchase object enters stage 1250223267", detail: "The LT purchase pipeline's 'completed' stage." },
      { num: "2", type: "update", action: "Set 'purchase_date' timestamp on Contact", detail: "Records when the purchase happened (via association type 19)." },
      { num: "3", type: "update", action: "Set Contact Lifecycle Stage → PQL (1249251492)", detail: "Highest-intent pre-SQL stage. Triggers priority list membership." }
    ]
  },

  // ──────────── SHOW RATE ENGINE ────────────
  {
    id: "1770760586",
    name: "Appointment — In Progress?",
    engine: "showrate",
    status: "enabled",
    objectType: "Appointment",
    enrollmentType: "Automated: time_until_appointment < 5 minutes",
    description: "Fires 5 minutes before every scheduled appointment. Sets 'discovery_call_outcome' and 'closing_call_outcome' to 'In Progress' on the associated Contact, and sets 'in_progress = Yes' on the Appointment record itself.",
    whyItMatters: "Allows real-time tracking of which calls are happening right now. Powers the 'In Progress' filter in the Closer Pipeline view.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: time_until_appointment < 5 minutes", detail: "Automated time-based trigger — no manual action needed." },
      { num: "2", type: "filter", action: "Check: final_outcome_of_appointment is unknown", detail: "Only fires if the appointment hasn't already been dispositioned." },
      { num: "3", type: "update", action: "Set 'discovery_call_outcome' → In Progress on Contact", detail: "Updates Contact via association type 906 (Setter/Discovery calls)." },
      { num: "4", type: "update", action: "Set 'closing_call_outcome' → In Progress on Contact", detail: "Updates Contact via association type 944 (Closer calls)." },
      { num: "5", type: "update", action: "Set 'in_progress' → Yes on Appointment", detail: "Flags the Appointment record itself as actively in session." }
    ]
  },
  {
    id: "1755975999",
    name: "Show Rate Engine - V2 - Final Appointment Disposition",
    engine: "showrate",
    status: "enabled",
    objectType: "Appointment",
    enrollmentType: "Event-based: sync__closer_call_outcome or sync__disco_outcome changes to No Show / Completed / Rescheduled / Canceled. Refinement: final_outcome_of_appointment is unknown.",
    description: "The final stage of the appointment lifecycle. Fires when a sync property (fed from Contact → Appointment) changes to a terminal outcome. Branches on Meeting Type (Discovery Call, Closer Call, Closer Follow Up Call), then on the outcome value. Stamps 'Final Outcome of Appointment', moves the pipeline stage, and swaps association labels from 'In Progress' to 'Past' to archive the record. Also handles Rescheduled outcomes by setting a Rescheduled stage.",
    whyItMatters: "This is the workflow that completes the full data loop. Without it, appointments would never get a Final Outcome, would never be archived from active views, and show rate reporting would be permanently broken.",
    nodes: [
      { num: "1", type: "branch", action: "Branch: Meeting Type", detail: "Static branch on meeting_type property. Routes to: Discovery Call → action 2; Closer Call → action 3; Closer Follow Up Call → action 47." },
      { num: "2", type: "branch", action: "Branch: sync__disco_outcome value", detail: "Completed → action 4; Canceled by Us → action 10; Canceled by Prospect → action 13; No Show → action 8; Rescheduled → action 64." },
      { num: "3", type: "branch", action: "Branch: sync__closer_call_outcome value", detail: "Completed → action 16; Canceled by Us → action 25; Canceled by Prospect → action 22; No Show → action 20; Rescheduled → action 67." },
      { num: "4", type: "update", action: "Set final_outcome_of_appointment → Completed (Discovery)", detail: "Stamps the final outcome on the Appointment record." },
      { num: "5", type: "branch", action: "Branch: Was it Confirmed or Never Confirmed?", detail: "Checks pipeline stage: 1269136023 = Confirmed → action 6; 1269136024 = Never Confirmed → action 7. Default → action 7." },
      { num: "6", type: "update", action: "Swap association label: Disco In Progress (1-43) → Past Disco (1-45)", detail: "Archives the appointment from active confirmation views. Confirmed path." },
      { num: "7", type: "update", action: "Set stage Never Confirmed + swap label to Past Disco", detail: "Sets pipeline stage 1269136024 (Never Confirmed) then swaps 1-43 → 1-45." },
      { num: "8", type: "update", action: "Set final_outcome → No Show (Discovery)", detail: "Stamps No Show outcome. Then swaps association label Disco In Progress → Past Disco (action 30)." },
      { num: "10", type: "update", action: "Set final_outcome → Canceled by Us (Discovery)", detail: "Stamps Canceled by Us. Sets pipeline stage 1268114334. Swaps label (action 28)." },
      { num: "13", type: "update", action: "Set final_outcome → Canceled by Them (Discovery)", detail: "Stamps Canceled by Them. Sets pipeline stage 1268114335. Swaps label (action 29)." },
      { num: "64", type: "update", action: "Set final_outcome → Rescheduled (Discovery)", detail: "Sets final_outcome = Rescheduled, pipeline stage 1278790583. Swaps Disco In Progress → Past Disco (action 66)." },
      { num: "16", type: "update", action: "Set final_outcome → Completed (Closer)", detail: "Stamps Completed. Branches on confirmation status. Swaps Closer In Progress (1-47) → Past Closer (1-49)." },
      { num: "20", type: "update", action: "Set final_outcome → No Show (Closer)", detail: "Stamps No Show. Swaps 1-47 → 1-49 (action 33)." },
      { num: "22", type: "update", action: "Set final_outcome → Canceled by Them (Closer)", detail: "Stamps Canceled by Them. Sets pipeline stage 1268114335. Swaps label (action 32)." },
      { num: "25", type: "update", action: "Set final_outcome → Canceled by Us (Closer)", detail: "Stamps Canceled by Us. Sets pipeline stage 1268114334. Swaps label (action 31)." },
      { num: "67", type: "update", action: "Set final_outcome → Rescheduled (Closer)", detail: "Sets final_outcome = Rescheduled, pipeline stage 1278790583. Swaps Closer In Progress → Past Closer (action 69)." },
      { num: "47", type: "branch", action: "Branch: sync__closer_follow_up_call_outcome", detail: "Completed / Canceled by Us / Canceled by Prospect / No Show / Rescheduled — mirrors Closer Call logic but for Follow Up calls." }
    ]
  },
  {
    id: "1756550227",
    name: "Show Rate Engine - Booking Advance Range Stamp",
    engine: "showrate",
    status: "enabled",
    objectType: "Appointment",
    enrollmentType: "Event-based: booking_advance_time property becomes known. Re-enrollment OFF (fires once at creation).",
    description: "Fires when the booking_advance_time calculation property is first populated on a new Appointment record. Branches on Meeting Type (Discovery Call, Closer Call, Closer Follow Up Call). Within each branch, checks the booking_advance_time value in milliseconds and stamps the 'booking_advance_range' dropdown property with the appropriate bucket.",
    whyItMatters: "Enables the show rate dashboard to correlate booking lead time with attendance rates. Data shows that appointments booked 1–4 days in advance tend to have higher show rates than same-day or week-out bookings. This stamp is required to build those reports.",
    nodes: [
      { num: "2", type: "branch", action: "Branch: Meeting Type", detail: "Discovery Call → action 3; Closer Call → action 9; Closer Follow Up Call → action 15." },
      { num: "3/9/15", type: "branch", action: "Branch: booking_advance_time ranges", detail: "≤86,400,000ms (24h) → Under 24 Hours; 86.4M–172.8M → 24–48h; 172.8M–259.2M → 48–72h; 259.2M–345.6M → 72–96h; >345.6M → Over 96 Hours." },
      { num: "4–8", type: "update", action: "Set booking_advance_range on Appointment", detail: "Writes one of: Under 24 Hours | Between 24-48 Hours | Between 48-72 Hours | Between 72-96 Hours | More than 96 Hours" }
    ]
  },
  {
    id: "1755384621",
    name: "Show Rate Engine - Confirmation Disposition (Pending, Confirmed, Never Confirmed)",
    engine: "showrate",
    status: "enabled",
    objectType: "Appointment",
    enrollmentType: "Event-based: hs_pipeline_stage changes to Canceled/Confirmed/Never Confirmed stages, OR setter_confirmation_list / closing_call_confirmation_list becomes known. Refinement: appointment in Confirmation Pipeline (850614794).",
    description: "The core confirmation state machine for the Confirmation Pipeline. Fires when an appointment's pipeline stage or confirmation list property changes. Branches on Meeting Type (Discovery Call, Closer Call, Closer Follow Up Call). Within each branch, checks 5 conditions: Canceled, Confirmed, Never Confirmed, Unconfirmed 24–48h, Unconfirmed <24h. Sets the pipeline stage, writes the confirmation status to the associated Contact, stamps datetime_confirmed, and sends Slack notifications. Canceled appointments are routed to the Canceled Disposition workflow (1755406259).",
    whyItMatters: "This is what makes the Confirmation Pipeline board actually update. Without it, a rep confirming a lead would have no automated effect on the appointment stage or contact status. It's also the source of all confirmation reporting data.",
    nodes: [
      { num: "1", type: "branch", action: "Branch: Meeting Type", detail: "Discovery Call → action 2; Closer Call → action 14; Closer Follow Up Call → action 37." },
      { num: "2", type: "branch", action: "Discovery Call — 5-way branch", detail: "Canceled (stage 1268114334/1268114335 + contact status canceled) → action 24 (Canceled workflow). Confirmed (stage 1269136023 + contact confirmed + setter_confirmation_list = Upcoming Confirmed) → action 3. Never Confirmed (stage 1269136024 + Never Confirmed list) → action 5. Unconfirmed 24–48h → action 7. Unconfirmed <24h → action 9." },
      { num: "3", type: "update", action: "Set pipeline stage → Confirmed (1269136023) — Discovery", detail: "Moves appointment to Confirmed stage in pipeline." },
      { num: "4", type: "update", action: "Set discovery_call_confirmation_status → Confirmed on Contact (assoc 906)", detail: "Writes Confirmed to the contact's confirmation status property." },
      { num: "11", type: "update", action: "Stamp datetime_confirmed + Slack notification", detail: "Sets datetime_confirmed = now. Fires Slack notification (actionTypeId 1-179507819) to confirmation owner." },
      { num: "5", type: "update", action: "Set pipeline stage → Never Confirmed (1269136024) — Discovery", detail: "Moves appointment to Never Confirmed stage." },
      { num: "6", type: "update", action: "Set discovery_call_confirmation_status → Never Confirmed on Contact", detail: "Writes Never Confirmed status + sends Slack alert." },
      { num: "7", type: "update", action: "Set pipeline stage → Unconfirmed <48h (1268114332)", detail: "Moves appointment to 48-hour unconfirmed stage." },
      { num: "9", type: "update", action: "Set pipeline stage → Unconfirmed <24h (1268114333)", detail: "Moves appointment to 24-hour unconfirmed stage (highest urgency)." },
      { num: "24/25", type: "enroll", action: "Route to Canceled Disposition Workflow (1755406259)", detail: "Hands off to the dedicated cancellation workflow for full deal + pipeline updates." },
      { num: "14", type: "branch", action: "Closer Call — same 5-way logic", detail: "Mirrors Discovery Call path but uses closing_call_confirmation_status and closing_call_confirmation_list properties. Association used: 1-47 for Closer In Progress." },
      { num: "37", type: "branch", action: "Closer Follow Up Call — same 5-way logic", detail: "Mirrors Closer Call path but uses closer_follow_up_call_confirmation_status property." }
    ]
  },
  {
    id: "1755406259",
    name: "Show Rate Engine - Appointment Disposition (Canceled)",
    engine: "showrate",
    status: "enabled",
    objectType: "Appointment",
    enrollmentType: "List-based: Associated contact's closing_call_confirmation_status = Canceled by Prospect or Canceled by Us (via association 47 or 43).",
    description: "Handles all appointment cancellations. Branches on Meeting Type (Discovery Call, Closer Call, Closer Follow Up Call). Within each branch, distinguishes Canceled by Prospect vs. Canceled by Us. Sets the appointment pipeline stage, writes the no-show/cancel type to the associated Deal, updates confirmation status on the Contact, and moves the Deal to the appropriate No Show / Cancel stage. For 'Canceled by Us' cases, checks if the cancellation reason is 'Disqualified' — if so, routes the deal to DQ (stage 1249082664) with the DQ reason populated. Ends by sending to the Final Disposition workflow.",
    whyItMatters: "Cancellations must update the deal pipeline correctly — a Discovery cancellation moves the deal to Setter No Show/Cancel (1249249109), a Closer cancellation moves it to Closing No Show/Cancel (1249249113). Without this, canceled appointments leave deals stuck in Booked stages forever.",
    nodes: [
      { num: "1", type: "branch", action: "Branch: Meeting Type", detail: "Discovery Call → action 2; Closer Call → action 11; Closer Follow Up Call → action 32." },
      { num: "2", type: "branch", action: "Discovery: Canceled by Prospect or Canceled by Us?", detail: "Stage 1268114335 + contact status Canceled by Prospect → action 3. Stage 1268114334 + contact status Canceled by Us → action 7." },
      { num: "3–6", type: "update", action: "Discovery — Canceled by Prospect path", detail: "Sets stage 1268114335. Sets disco__no_show__cancel_type = Canceled by Prospect on Deal (assoc 944). Sets discovery_call_confirmation_status = Canceled by Prospect on Contact (assoc 906). Sets dealstage = 1249249109 (Setter No Show/Cancel)." },
      { num: "7–10", type: "update", action: "Discovery — Canceled by Us path", detail: "Sets stage 1268114334. Sets confirmation status = Canceled by Us. Checks if cancellation_reason = Disqualified → if yes: sets disco__no_show__cancel_type = Canceled by Us + disco_call__dq_reason = Other + dealstage = 1249249109. If no: sets dealstage = 1249249109 directly." },
      { num: "11–19", type: "update", action: "Closer Call — same logic", detail: "Uses closing__no_show__cancel_type and closing_call_confirmation_status. Deal moves to 1249249113 (Closing No Show/Cancel). DQ path uses closing_call__dq_reason." },
      { num: "20–31", type: "update", action: "Closer Call — Canceled by Us path", detail: "Checks cancellation_reason. If Disqualified: sets closing__no_show__cancel_type = Canceled by Us + closing_call__dq_reason = cancellation_reason value + dealstage = 1249082664 (DQ)." },
      { num: "32–43", type: "update", action: "Closer Follow Up Call — mirrors Closer Call logic", detail: "Uses closer_follow_up_call__no_show__cancel_type and closer_follow_up_call_confirmation_status." }
    ]
  },
  {
    id: "1754815892",
    name: "Show Rate Engine - Confirmation List",
    engine: "showrate",
    status: "enabled",
    objectType: "Contact",
    enrollmentType: "List-based: Contact is member of Lists 2379, 2380, 2381, 2382, or 2392. Re-enrollment ON for all 5 lists.",
    description: "Connects the 5 time-based confirmation lists to the Appointment object properties. Fires when a contact enters or changes confirmation lists. Branches on which call type is active (Closer Calls, Setter/Discovery Calls, or Closer Follow Up Calls) based on associated appointment meeting type and call outcome = Scheduled. Within each branch, checks which of the 5 lists the contact is currently in, then stamps the corresponding confirmation list property on the associated Appointment record.",
    whyItMatters: "The Confirmation Disposition workflow depends on these appointment-level properties. This is the bridge between the contact-based list system and the appointment-based pipeline. Without it, appointment pipeline stages would never move based on time-to-appointment.",
    nodes: [
      { num: "1", type: "branch", action: "Branch: What type of call is active?", detail: "Closer Calls (assoc 48, meeting_type = Closer Call, closing_call_outcome = Scheduled) → action 2. Setter Calls (assoc 44, meeting_type = Discovery Call, discovery_call_outcome = Scheduled) → action 8. Closer Follow Up (assoc 48, meeting_type = Closer Follow Up Call, closer_follow_up_call_outcome = Scheduled) → action 14." },
      { num: "2/8/14", type: "branch", action: "Branch: Which list is the contact in?", detail: "List 2382 (Confirmed) → Upcoming Confirmed Appointments. List 2380 (<24h unconfirmed) → Unconfirmed - <24 Hours. List 2381 (<48h unconfirmed) → Unconfirmed - <48 Hours. List 2392 (Never Confirmed) → Never Confirmed. List 2379 (>48h) → Upcoming Appointments." },
      { num: "3–7", type: "update", action: "Set closing_call_confirmation_list on Appointment (assoc 907)", detail: "Writes the matched list value to the closing_call_confirmation_list property on the associated Appointment." },
      { num: "9–13", type: "update", action: "Set setter_confirmation_list on Appointment (assoc 907)", detail: "Writes the matched list value to the setter_confirmation_list property." },
      { num: "15–19", type: "update", action: "Set closer_follow_up_call_confirmation_list on Appointment (assoc 907)", detail: "Writes the matched list value to the closer_follow_up_call_confirmation_list property." }
    ]
  },
  {
    id: "1751965492",
    name: "Show Rate Engine - Rescheduled / Time Change Updates",
    engine: "showrate",
    status: "enabled",
    objectType: "Appointment",
    enrollmentType: "Event-based: sync__disco_start_time or sync__closer_call_start_time changes to a past date (before today). Refinement: meeting_type = Discovery Call or Closer Call.",
    description: "Fires when the synced start time of an appointment changes to reflect a reschedule or time change. Branches on Meeting Type and copies the updated start time from the sync property back to hs_appointment_start on the Appointment record. This keeps the Appointment object's official start time in sync when a reschedule occurs.",
    whyItMatters: "When a meeting is rescheduled, the synced start time properties on the Contact update first. Without this workflow, the Appointment record's hs_appointment_start would still show the old time, breaking time-based automations (the 5-minute In Progress trigger, booking advance calculations, etc.).",
    nodes: [
      { num: "1", type: "branch", action: "Branch: Meeting Type", detail: "Discovery Call → action 2; Closer Call → action 3; Closer Follow Up Call → action 4." },
      { num: "2", type: "update", action: "Set hs_appointment_start = sync__disco_start_time", detail: "Copies the rescheduled start time from the Discovery Call sync property to the Appointment's official start time." },
      { num: "3", type: "update", action: "Set hs_appointment_start = sync__closer_call_start_time", detail: "Copies the rescheduled start time from the Closer Call sync property." },
      { num: "4", type: "update", action: "Set hs_appointment_start = sync__closer_follow_up_call_start_time", detail: "Copies the rescheduled start time from the Closer Follow Up sync property." }
    ]
  },
  {
    id: "1755976627",
    name: "Show Rate Engine - Pre-Call Setter Communication (Simple)",
    engine: "showrate",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "List-based: Contact is in Lists 2379, 2380, 2381, or 2382. Re-enrollment ON.",
    description: "Sends pre-call email/SMS sequences to contacts based on their confirmation list status. First sets the contact as MARKETABLE, then branches on list membership: Unconfirmed >48h, Unconfirmed 24–48h, Unconfirmed <24h, or Confirmed. Currently DISABLED — email/SMS assets need to be configured before activating. Designed for Setter/Discovery Call confirmations.",
    whyItMatters: "Automated pre-call communication reduces no-shows without manual rep effort. The 4-list system ensures messaging is time-appropriate — light nudge at 48h, urgent at <24h, 'thanks for confirming' when confirmed.",
    nodes: [
      { num: "1", type: "update", action: "Set contact as MARKETABLE", detail: "Ensures the contact is eligible to receive marketing emails before any send actions." },
      { num: "2", type: "branch", action: "Branch: Which confirmation list?", detail: "Checks membership in: List 2379 (>48h unconfirmed), List 2381 (24–48h unconfirmed), List 2380 (<24h unconfirmed), List 2382 (confirmed)." },
      { num: "3+", type: "email", action: "Send time-appropriate email/SMS (not yet configured)", detail: "Content IDs need to be linked. >48h: light nudge. 24–48h: stronger nudge. <24h: urgency message. Confirmed: thanks + prep email." }
    ]
  },
  {
    id: "1755942930",
    name: "Show Rate Engine - Pre-Call Closer Communication (Simple)",
    engine: "showrate",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "Manual enrollment only. Re-enrollment ON.",
    description: "Mirror of the Setter Pre-Call Communication workflow for Closer/Strategy Session calls. Same list-based branching (>48h, 24–48h, <24h, confirmed). Currently DISABLED and manually enrolled only. Requires Closer-specific email/SMS templates to be configured.",
    whyItMatters: "Closer calls need separate messaging from Setter calls — different context, higher stakes, different CTA. This workflow keeps the two communication tracks independent.",
    nodes: [
      { num: "1", type: "update", action: "Set contact as MARKETABLE", detail: "Pre-flight check before any email sends." },
      { num: "2", type: "branch", action: "Branch: Which confirmation list?", detail: "Same 4 lists as Setter version: 2379, 2381, 2380, 2382." }
    ]
  },

  // ──────────── CLOSER ENGINE ────────────
  {
    id: "1751708734",
    name: "Closer Engine — Meeting Disposition — Canceled/RS",
    engine: "closer",
    status: "enabled",
    objectType: "Contact",
    enrollmentType: "Event-based: Meeting outcome = CANCELED or RESCHEDULED",
    description: "Handles every canceled or rescheduled meeting. Branches on whether it's a true reschedule or a time change, then further branches by meeting type (Setter Call, Closer Call, Closer Follow Up). Updates outcome properties on Contact and Deal, moves deal stages in the Sales Momentum Pipeline, and creates/updates Appointment records for rescheduled meetings.",
    whyItMatters: "Without this, canceled meetings would leave deals stuck in 'Booked' stages forever and outcome properties would never be written — breaking all reporting.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: Meeting outcome = CANCELED or RESCHEDULED", detail: "Event-based on HubSpot native meeting outcome field." },
      { num: "2", type: "branch", action: "Branch: Canceled/Rescheduled vs. Time Change", detail: "True cancel/reschedule vs. a simple time-slot adjustment on the same meeting." },
      { num: "3", type: "branch", action: "Branch: What type of meeting?", detail: "Routes to sub-branch: Setter Call, Closer Call, or Closer Follow Up." },
      { num: "4", type: "update", action: "Update Outcome Properties on Contact", detail: "Sets 'discovery_call_outcome', 'closing_call_outcome', or 'closer_follow_up_call_outcome' to Canceled or Rescheduled." },
      { num: "5", type: "update", action: "Update Outcome Properties on Deal", detail: "Mirrors the outcome to the Deal record. Pipeline: 840860960 (Sales Momentum Pipeline)." },
      { num: "6", type: "update", action: "Update Deal Stage", detail: "For cancellations: moves deal to 'Setter No Show / Canceled' or 'Closing Call No Show / Canceled'." },
      { num: "7", type: "update", action: "Update Booked Datetimes", detail: "Clears or updates 'last_disco_call_booked', 'last_closing_call_datetime' as appropriate." },
      { num: "8", type: "create", action: "Create/Update Appointment Record (Reschedule only)", detail: "For true reschedules, creates a new Appointment or updates existing one with new time." }
    ]
  },
  {
    id: "1764489887",
    name: "Calendly Integration — Set Meeting Type (Updated)",
    engine: "closer",
    status: "enabled",
    objectType: "Contact",
    enrollmentType: "Event-based: calendly_scheduled_event_uri or calendly_event_type_uri property changes (contact property change event ID 4-655002). Re-enrollable.",
    description: "Fires when a Calendly booking is detected. Does 3 critical jobs: (1) eliminates duplicate meeting records created by Google Calendar sync + Calendly, (2) fetches Calendly event details including the internal_note which contains the Meeting Type and Booking Method, and (3) updates the HubSpot meeting record's activity type and sets the booking method on the contact.",
    whyItMatters: "Calendly and Google Calendar sync can both create meeting records, causing duplicates. This workflow is the single source of truth for: what type of meeting was booked, whether it was inbound or outbound, and cleaning up the duplicate. Without it, reporting on meeting types would be inaccurate.",
    nodes: [
      { num: "28", type: "update", action: "Step 1 — Set 'currently_in_deal_creation' → Yes", detail: "Flags the contact as being processed so the Error Handler knows a booking is in progress." },
      { num: "27", type: "code", action: "Step 2 — Custom Code: Duplicate Meeting Cleaner", detail: "Secret: Fluffy_Timezone. Fetches ALL associated meetings. Groups by hs_timestamp. For each group with 2+ meetings, identifies the Google Calendar sync record (has hs_unique_id) as the KEEPER. Deletes Calendly-created duplicate if both created within 15 minutes." },
      { num: "12", type: "code", action: "Step 3 — Custom Code: Fetch Scheduled Event Details from Calendly API", detail: "Secret: Calendly_Token. Reads calendly_scheduled_event_uri. Calls GET /scheduled_events/{uuid} and /invitees. Extracts: external_cal_id, calendly_uuid, booking_time_zone, cancel_url, reschedule_url, set_by_string." },
      { num: "24", type: "update", action: "Step 4 — Set 'calendly_scheduled_event_uuid' on Contact", detail: "Writes the Calendly event UUID for deduplication cross-referencing." },
      { num: "15", type: "update", action: "Step 5 — Set 'last_meetings_unique_id' on Contact", detail: "Writes the external Google Calendar event ID — the linking key between HubSpot and Google Calendar for cancellations." },
      { num: "14", type: "update", action: "Step 6 — Set 'booking_time_zone' on Contact", detail: "Writes the invitee's IANA timezone (e.g. 'America/New_York')." },
      { num: "16", type: "update", action: "Step 7 — Set 'last_meetings_cancel_link' on Contact", detail: "Writes the Calendly-generated cancel URL for the booking." },
      { num: "17", type: "update", action: "Step 8 — Set 'last_meetings_reschedule_link' on Contact", detail: "Writes the Calendly-generated reschedule URL for the booking." },
      { num: "6", type: "code", action: "Step 9 — Custom Code: Fetch Internal Note from Calendly Event Type", detail: "Secret: Calendly_Token. Reads calendly_event_type_uri. Calls Event Type API (the template, not the scheduled event). Extracts 'internal_note': 'Meeting Type - Booking Method - notes' format." },
      { num: "9", type: "update", action: "Step 10 — Set 'calendly_internal_note' on Contact", detail: "Writes the raw internal_note text for parsing by next step." },
      { num: "8", type: "code", action: "Step 11 — Custom Code: Parse Internal Note → Update Meeting Record", detail: "Secret: Fluffy_Timezone. Splits by ' - ' to extract: meetingType (part 1), bookingMethod (part 2). Finds most recently CREATED meeting. Updates that meeting's hs_activity_type. Outputs: applied_meeting_type, booking_method, updated_meeting_id." },
      { num: "18", type: "branch", action: "Step 12 — Branch: Inbound or Outbound?", detail: "Reads booking_method output. Inbound → action 19; Outbound → action 20; blank/unknown → action 21." },
      { num: "19-21", type: "update", action: "Steps 13A/B/C — Set booking method on Contact", detail: "Sets 'last_meetings_booking_method' to Inbound, Outbound, or blank. Then jumps to action 13." },
      { num: "13", type: "code", action: "Step 13 — Custom Code: Write External Calendar ID to Meeting.hs_unique_id", detail: "Secret: Fluffy_Timezone. Takes updated_meeting_id + external_cal_id. Updates meeting's hs_unique_id with Google Calendar external event ID. Critical for deduplication." },
      { num: "22", type: "code", action: "Step 14 — Custom Code: Validate 'set_by_string' (Last Meeting Set By User)", detail: "Secret: Fluffy_Timezone. Validates HubSpot User ID from Calendly form answer against Owners API. If valid: writes to 'last_meeting_set_by_user'. If invalid: clears the property." },
      { num: "23", type: "enroll", action: "Step 15 — Enroll in Workflow 1764414303", detail: "Triggers a downstream workflow after all processing is complete (likely Big Brain or follow-up sync)." }
    ]
  },
  {
    id: "1752818856",
    name: "Sales — Big Brain — Front End Sales Pipeline — Stage Automation",
    engine: "closer",
    status: "enabled",
    objectType: "Deal",
    enrollmentType: "Event-based: dealstage property changes (re-enrollable). Refinement: Pipeline must be Sales Momentum Pipeline (ID: 840860960).",
    description: "The master deal stage automation for the entire Sales Momentum Pipeline. Fires every time a deal stage changes. Routes to 13 stage-specific branches, each setting the correct contact/deal properties, lifecycle stages, lead statuses, and contact outcomes. Also handles: Setter Previously Booked detection, Red Zone Slack notifications, Won deal onboarding (subscription opt-in + marketing consent), offer made date stamping, and association label changes.",
    whyItMatters: "Without this, moving a deal between stages would have zero downstream effect. This workflow is what makes the CRM 'smart' — turning a simple stage drag into a chain of automated updates across contacts, lifecycle stages, Slack channels, and other workflows.",
    nodes: [
      { num: "1", type: "branch", action: "Primary Branch: Which deal stage? (13-way)", detail: "Routes to stage-specific sub-flows for all 13 stages: 1249249108 (Setter Booked), 1249249109 (Setter No Show), 1249249110 (Setter Qualified), 1249082664 (DQ), 1249249111 (Closing Booked), 1249249113 (Closing No Show), 1249082661 (Closing Qualified/Nurture), 1249249114 (Red Zone), 1249082662 (Closed Won), 1249082663 (Closed Lost), 1304497077 (Pending Approval), 1305087038 (Closer Follow Up Booked), 1308102182 (Setter Follow Up Booked)." },
      { num: "2-6", type: "update", action: "Stage: Setter Call Booked", detail: "Copies last_disco_call_booked datetime to deal. Sets discovery_call_outcome = Scheduled on deal. Sets contact lifecycle = lead. Sets discovery_call_outcome = Scheduled on contact. Sets contact Lead Status = MEETING_BOOKED. Sets deal sdr_owner from contact." },
      { num: "17-25", type: "branch", action: "Stage: Setter No Show / Cancel — Branch by Cancel Type", detail: "Sets Contact Lead Status = NO_SHOW/CANCEL. Branches on disco__no_show__cancel_type: Canceled by Us / Canceled by Prospect / No Show / Rescheduled → writes matching outcomes. No Show: stamps disco_call_no_show_date." },
      { num: "43-46", type: "update", action: "Stage: Setter Qualified (Discovery Complete)", detail: "Sets deal discovery_call_outcome = Completed. Sets contact discovery_call_outcome = Completed. Sets contact Lifecycle = salesqualifiedlead. Sets contact Lead Status = IN_PROGRESS." },
      { num: "53-59", type: "branch", action: "Stage: DQ — Branch by DQ Source (Setter vs Closer)", detail: "Checks which DQ reason field is filled. Setter DQ path: discovery outcomes = Completed, Contact Lead Status = UNQUALIFIED. Closer DQ path: closing outcomes written, Contact Lead Status = UNQUALIFIED. Both change association label 1-39 → 1-41." },
      { num: "60-66", type: "update", action: "Stage: Red Zone — Slack Alert + Set Properties", detail: "Posts 🚩🚩 NEW RED-ZONE Slack to C0ADDPT64BE. Sets deal closer_call_outcome = Canceled by Team. Sets contact closing_call_outcome = Completed. Contact Lifecycle → opportunity. Contact Lead Status = RED_ZONE. Stamps offer_made_date. Sets offer_made_ = Yes." },
      { num: "98-77", type: "update", action: "Stage: Closed Won", detail: "Sets marketing email subscription (type 69952621, OPT_IN, LEGITIMATE_INTEREST_CLIENT). Sets contact as MARKETABLE. Sets contact Lifecycle = customer. Contact Lead Status = CLOSED_WON. Stamps closedate = now. Stamps offer_made_date if not already set. Fires Zapier webhook for win notification." },
      { num: "80-88", type: "update", action: "Stage: Closed Lost", detail: "Contact Lead Status = CLOSED_LOST. Contact Lifecycle = opportunity. Sets closing outcomes. Sets offer_made_ = Yes. Stamps offer_made_date if not known. Association label 1-39 → 1-41." },
      { num: "105", type: "webhook", action: "Stage: Pending Approval — Webhook to Zapier", detail: "Fires POST to https://hooks.zapier.com/hooks/catch/25588006/ucbu0h2/ when deal moves to Pending Approval. Zap sends notification to #Sales-Approval Slack channel." },
      { num: "8-14", type: "update", action: "Stage: Closing Call Booked", detail: "Copies last_closing_call_datetime to deal. Sets deal closer_call_outcome = Canceled by Prospect (placeholder). Sets contact closing_call_outcome = Scheduled. Sets deal owner from closer_owner. Sets contact Lead Status = OPEN_DEAL. Checks if Setter was previously booked → if so, sets discovery outcomes = Completed." },
      { num: "26-42", type: "branch", action: "Stage: Closing No Show/Cancel — Branch by Cancel Type", detail: "Sets Contact Lead Status = NO_SHOW/CANCEL. Branches on closing__no_show__cancel_type. No Show: stamps closing_call_no_show_date." },
      { num: "47-52", type: "update", action: "Stage: Closing Qualified/Nurture", detail: "Sets closer_call_outcome = Canceled by Team. Contact closing_call_outcome = Completed. Contact Lifecycle = opportunity. Contact Lead Status = OPEN_DEAL. Stamps offer_made_date if offer_made_ = Yes." },
      { num: "108-121", type: "update", action: "Stages: Closer Follow Up + Setter Follow Up Booked", detail: "Copies datetimes from contact to deal. Sets placeholder outcomes. Assigns deal owner. Sets lifecycle and lead status. Handles previously-booked Setter detection." }
    ]
  },
  {
    id: "1778074463",
    name: "Pending Deals Notification → Slack (#Sales-Approval)",
    engine: "closer",
    status: "disabled",
    objectType: "Deal",
    enrollmentType: "List-based: Deal stage = Pending Approval (1304497077). Re-enrollment not set.",
    description: "When a deal enters 'Pending Approval', fires a webhook to Zapier which posts a formatted Slack message to #Sales-Approval. Currently DISABLED — the Stage Automation workflow (action 105) handles the same Zapier webhook. Enabling both simultaneously would cause the webhook to fire twice.",
    whyItMatters: "Ensures the finance/approval team is notified when a deal reaches the payment stage. Currently disabled to prevent duplicate notifications — only one of this or the Stage Automation's action 105 should be active.",
    nodes: [
      { num: "4", type: "webhook", action: "Webhook POST → Zapier (hooks.zapier.com/hooks/catch/25588006/ucbu0h2/)", detail: "Fires the same Zapier catch URL as the Stage Automation workflow (action 105). Do NOT enable while Stage Automation is also active." }
    ]
  },
  {
    id: "1754196400",
    name: "Closer Engine — Communication — Closer Nurture",
    engine: "closer",
    status: "disabled",
    objectType: "Contact",
    enrollmentType: "Event-based: Contact is a member of List 2371. Re-enrollment is OFF.",
    description: "Sends a nurture email to contacts in the Closer Nurture list (List 2371). After a 4320-minute delay (72 hours / 3 days), sends email content_id 0. Currently DISABLED. Supports the 'Closing Qualified/Nurture' deal stage for contacts who need automated warmth while the closer works their pipeline.",
    whyItMatters: "Nurture deals can easily fall through the cracks if a closer gets busy. This provides an automated 'keep warm' touchpoint. The 72-hour delay ensures the email lands after the rep has had a chance to make personal contact first.",
    nodes: [
      { num: "1", type: "delay", action: "Wait 4320 minutes (72 hours / 3 days)", detail: "Waits 3 days before sending the nurture email. Gives the Closer time to make personal contact first." },
      { num: "2", type: "email", action: "Send Email — content_id: 0", detail: "Sends the configured nurture email. Goal condition: Deal stage is not 1249082661 (Closing Qualified/Nurture) — if deal has moved, contact exits workflow automatically." }
    ]
  },
  {
    id: "1752344694",
    name: "SUNSET — Setter/Closer Engine Nurture Mechanism",
    engine: "closer",
    status: "disabled",
    objectType: "Deal",
    enrollmentType: "Deal property change: nurture_type set",
    description: "When a deal enters Nurture (Setter or Closer), creates a follow-up task scheduled 7 days before the 'next touch date'. Also handles 'Past Nurture' cleanup — when a deal exits Nurture, clears nurture properties to prevent stale data. SUNSET — manually reviewing deals in views is now the preferred process.",
    whyItMatters: "Originally the automated nurture task system. Replaced by manual view-based management, but still referenced in cleanup logic for deals exiting nurture.",
    nodes: [
      { num: "1", type: "filter", action: "Trigger: nurture_type property set on Deal", detail: "Fires when a Closer or Setter marks a deal as Nurture." },
      { num: "2", type: "branch", action: "Branch: Setter Nurture or Closer Nurture?", detail: "Routes to appropriate task queue: 11204487 (setter) or 11204488 (closer)." },
      { num: "3", type: "create", action: "Create Task: 7 days before next touch date", detail: "Creates a HubSpot task reminder in the correct queue." },
      { num: "4", type: "branch", action: "Branch: Deal exiting nurture? (Past Nurture cleanup)", detail: "Detects when a deal is moved out of nurture staging." },
      { num: "5", type: "update", action: "Clear Nurture Properties", detail: "Clears: nurture_type, setter_nurture_date, closer_nurture_date, setter__next_touch_date_nurture, closer__next_touch_date_nurture." }
    ]
  }
];

// ============================================================
// PROPERTIES
// ============================================================
WB.properties = {
  appointment: [
    {
      group: "Identification",
      props: [
        { name: "First Name", type: "Single Line Text", definition: "First name of the lead associated with the appointment.", trigger: "Record naming and easy search in setter views.", used: "Display name on appointment records." },
        { name: "Last Name", type: "Single Line Text", definition: "Last name of the lead.", trigger: "Record naming and easy search.", used: "Display name on appointment records." },
        { name: "Appointment Start Time (hs_appointment_start)", type: "Date & Time Picker", definition: "The master source of truth for when the meeting is scheduled. Updated by the Rescheduled/Time Change workflow when reschedules occur.", trigger: "Master trigger for all timing-related automations: In Progress flag, Never Confirmed logic, reminder sequences.", used: "Calendar views, time-series dashboard reports." },
        { name: "Confirmation Owner", type: "HubSpot User", definition: "The rep responsible for confirming this appointment. Set automatically via round-robin (Appointments Delegation workflow).", trigger: "Controls Confirmation View filtering — reps only see their own appointments.", used: "Reporting: Show Rate by Specialist." },
      ]
    },
    {
      group: "Show Rate Engine — Booking & Confirmation",
      props: [
        { name: "Meeting Type", type: "Dropdown Select", definition: "Categorizes the appointment: Discovery Call | Closer Call | Closer Follow Up Call | Client Success - Onboarding | Client Success - 1 on 1.", trigger: "Controls branching logic in Big Brain, Booking Advance Stamp, Confirmation List, Confirmation Disposition, Final Disposition, and Rescheduled workflows.", used: "Primary filter for the entire Show Rate Dashboard. Separates Setter vs. Closer call reporting." },
        { name: "Booking Advance Time", type: "Calculation", definition: "Auto-calculates: Appointment Start Time − Object Create Date. How far in advance was the booking made? Stored in milliseconds.", trigger: "Feeds into 'Booking Advance Range Stamp' workflow (1756550227) when value becomes known.", used: "Dashboard: Analyzes if calls booked further out have lower show rates." },
        { name: "Booking Advance Range", type: "Dropdown Select", definition: "Bucket for Booking Advance Time: Under 24 Hours | Between 24-48 Hours | Between 48-72 Hours | Between 72-96 Hours | More than 96 Hours.", trigger: "Written by 'Booking Advance Range Stamp' workflow.", used: "Dashboard analysis: identify optimal booking lead time for maximum show rate." },
        { name: "Closing Call Confirmation List", type: "Dropdown Select", definition: "The confirmation stage for Closer/Strategy Session appointments: Upcoming Appointments | Unconfirmed - <48 Hours | Unconfirmed - <24 Hours | Upcoming Confirmed Appointments | Never Confirmed.", trigger: "Triggers movement of the Appointment card in the Confirmation Pipeline via the Confirmation Disposition workflow.", used: "Smart View: Reps Daily Confirmation Queue. Drives Confirmation Pipeline automation." },
        { name: "setter_confirmation_list", type: "Dropdown Select", definition: "The confirmation stage for Discovery/Setter Call appointments: Upcoming Appointments | Unconfirmed - <48 Hours | Unconfirmed - <24 Hours | Upcoming Confirmed Appointments | Never Confirmed.", trigger: "Triggers Confirmation Pipeline stage movement for Discovery Call appointments.", used: "Confirmation Pipeline for Setter calls." },
        { name: "closer_follow_up_call_confirmation_list", type: "Dropdown Select", definition: "The confirmation stage for Closer Follow Up Call appointments. Same values as other confirmation list properties.", trigger: "Triggers Confirmation Pipeline stage movement for Follow Up appointments.", used: "Confirmation Pipeline for Follow Up calls." },
        { name: "Date/Time Confirmed (datetime_confirmed)", type: "Date & Time Picker", definition: "Timestamp of when the rep manually flipped the status to 'Confirmed'.", trigger: "Stamped by Confirmation Disposition workflow when Confirmed branch fires.", used: "KPI: Calculate rep efficiency — how early are we confirming calls? Goal: 24 hours before." },
        { name: "Confirmation Lead Time", type: "Calculation", definition: "Appointment Start Time minus Date/Time Confirmed.", trigger: "N/A.", used: "KPI 'Average Confirmation Lead Time'. Goal: 24 hours before the call." },
        { name: "Reschedule Requested", type: "Single Checkbox", definition: "Flag set when the lead clicks a reschedule link or contacts the rep to move the meeting.", trigger: "Triggers a Slack alert to the Setter Owner to prioritize manual re-outreach.", used: "View: 'Reschedule Requests' in the Confirmation Pipeline." },
      ]
    },
    {
      group: "Show Rate Engine — Outcome Tracking",
      props: [
        { name: "Final Outcome of Appointment", type: "Dropdown Select", definition: "The true result of the meeting: Completed | No Show | Canceled by Us | Canceled by Them | Rescheduled.", trigger: "Written by Final Appointment Disposition workflow (1755975999). Also written by Cancellation Disposition workflow. Triggers 'Past' association label swap. Removes record from 'Active' views.", used: "The 'Golden Metric': calculates the final Show Rate % for the entire company." },
        { name: "Sync — Disco Outcome (sync__disco_outcome)", type: "Property Sync", definition: "A mirrored copy of the Discovery/Setter Call outcome, pulled from the Contact (discovery_call_outcome property).", trigger: "Triggers enrollment in Final Appointment Disposition workflow when value changes to a terminal outcome.", used: "Source for Final Disposition workflow branching on Discovery Call path." },
        { name: "Sync — Closer Call Outcome (sync__closer_call_outcome)", type: "Property Sync", definition: "A mirrored copy of the Closer Call outcome, pulled from the Contact (closing_call_outcome property).", trigger: "Triggers enrollment in Final Appointment Disposition workflow.", used: "Source for Final Disposition workflow branching on Closer Call path." },
        { name: "Sync — Closer Follow Up Call Outcome (sync__closer_follow_up_call_outcome)", type: "Property Sync", definition: "A mirrored copy of the Closer Follow Up Call outcome from the Contact.", trigger: "Triggers Final Disposition workflow for Follow Up call path.", used: "Source for Final Disposition branching on Follow Up path." },
        { name: "in_progress", type: "Yes/No", definition: "Flags the appointment as actively in-session (set 5 minutes before start time).", trigger: "Set by 'Appointment — In Progress?' workflow (1770760586).", used: "Real-time filter in the Closer Pipeline view." },
        { name: "Sync — Disco Start Time (sync__disco_start_time)", type: "Property Sync", definition: "Mirrored copy of last_disco_call_booked from Contact. Triggers Rescheduled/Time Change workflow when updated.", trigger: "Triggers 'Rescheduled / Time Change Updates' workflow enrollment when the value changes to a past date.", used: "Source for updating hs_appointment_start on reschedule." },
        { name: "Sync — Closer Call Start Time (sync__closer_call_start_time)", type: "Property Sync", definition: "Mirrored copy of last_closing_call_datetime from Contact.", trigger: "Triggers Rescheduled / Time Change Updates workflow for Closer calls.", used: "Source for updating hs_appointment_start on Closer call reschedule." },
        { name: "Sync — Closer Follow Up Start Time (sync__closer_follow_up_call_start_time)", type: "Property Sync", definition: "Mirrored copy of last_closer_follow_up_call_datetime from Contact.", trigger: "Triggers Rescheduled / Time Change Updates for Follow Up reschedules.", used: "Source for updating appointment start time on Follow Up reschedule." },
      ]
    },
    {
      group: "Technical / Integration Fields",
      props: [
        { name: "external_calendar_event_id", type: "Single Line Text", definition: "The unique ID of this event in Google Calendar. Written by the Big Brain workflow.", trigger: "Used by n8n/Zapier to identify the correct Google Calendar event for updates and deletions.", used: "Integration field — do not edit manually." },
        { name: "calendly_scheduled_event_uri", type: "Single Line Text", definition: "The Calendly event URI for this specific booking.", trigger: "Read by the Big Brain workflow to look up meeting details. Cleared after use.", used: "Integration field — populated by Zapier, cleared by Big Brain." },
        { name: "calendly_event_type_uri", type: "Single Line Text", definition: "The Calendly event type URI (identifies which scheduling link was used).", trigger: "Helps determine which rep/link was used to book the meeting.", used: "Integration field — used in the Error Handler workflow." },
        { name: "booking_method", type: "Single Line Text", definition: "Records how the booking was made (e.g., Calendly, HubSpot Meetings, Manual).", trigger: "N/A.", used: "Reporting: compare show rates by booking method." },
        { name: "reschedule_link", type: "Single Line Text", definition: "The Calendly reschedule link for this specific booking. Auto-populated.", trigger: "N/A.", used: "Sent to leads in confirmation messages." },
        { name: "cancel_link", type: "Single Line Text", definition: "The Calendly cancellation link for this specific booking.", trigger: "N/A.", used: "Sent to leads in reminder messages." },
        { name: "set_by", type: "Single Line Text", definition: "Records which rep or system created the booking.", trigger: "N/A.", used: "Attribution reporting." },
        { name: "cancellation_reason", type: "Dropdown Select", definition: "Why the appointment was canceled during the confirmation process: Not Interested | Scheduling Conflict | Disqualified | Emergency | Last-Minute Cancel.", trigger: "Read by Cancellation Disposition workflow — if Disqualified, routes deal to DQ stage.", used: "Cancellation source reporting. Disqualified reason auto-populates DQ reason on deal." },
      ]
    }
  ],

  contact: [
    {
      group: "Setter Engine — Core",
      props: [
        { name: "SDR Owner / Setter Owner", type: "HubSpot User", definition: "The specific Setter assigned to this lead.", trigger: "Triggers owner-specific filtered Smart Views. Used to attribute commissions for 'Sets' and 'Verified' leads.", used: "Primary filter for all Setter Smart Views (P1–P4)." },
        { name: "Lead Status", type: "Radio Select", definition: "The master state of the lead: NEW | PROSPECTING | IN_PROGRESS | MEETING_BOOKED | OPEN_DEAL | BAD_TIMING | NO_PROGRESS | NO_SHOW/CANCEL | UNQUALIFIED | DECAYING | RED_ZONE | CLOSED_WON | CLOSED_LOST | BAD_DATA | DO_NOT_CONTACT | BLACKLISTED_CUSTOMER | REPEAT_CUSTOMER | CONTACT (NON-LEAD).", trigger: "The master filter determining which Smart View the lead appears in (P1–P5). Drives the MQL/SQL lifecycle upgrades.", used: "The single most important reporting filter in the CRM." },
        { name: "Last Opt-in Time-Stamp", type: "Date Picker", definition: "The exact time the lead submitted an opt-in form today.", trigger: "Triggers the Lead Delegation Round Robin. Used to detect 'Lead Speed' and mark the re-engagement cycle.", used: "Speed to Lead calculations. 'Lead Lifetime' analysis and marketing frequency reporting." },
        { name: "Lead Delegated Date/Time Stamp", type: "Date & Time Picker", definition: "The time assignment happened, adjusted for business hours.", trigger: "The 'Clock Start': All Speed to Lead measurements calculate from this exact second.", used: "Speed to Lead Dashboard — measures rep responsiveness from this precise timestamp." },
        { name: "Time Since Delegation", type: "Calculation", definition: "Real-time calculation of how long a lead has been 'waiting'.", trigger: "If 2 hours pass and the lead is still New, triggers an 'Overdue' red flag notification.", used: "Used in the Lead Notification report for the operations manager." },
      ]
    },
    {
      group: "Setter Engine — Call & Activity Tracking",
      props: [
        { name: "Outbound Calls - Total (sm__number_of_outbound_calls)", type: "Number", definition: "Count of all outbound call attempts (Aloware + HubSpot native). Incremented by Universal Call Tracker.", trigger: "When = 1: triggers 'First Outbound Call Datetime Stamp' workflow. When > 1: triggers STL Range Stamp workflow.", used: "KPI 'Daily Dial Volume' per rep. Source for all Speed to Lead calculations." },
        { name: "Last Outbound Call Date (sm__last_outbound_call_date)", type: "Date & Time Picker", definition: "Timestamp of the most recent outbound call attempt. Updated by Universal Call Tracker.", trigger: "Triggers the 'Nurture Refresh' logic (removes leads already called today).", used: "Smart View filter: 'Not Called Today'." },
        { name: "First Outbound Call Date (sm__first_outbound_call_date)", type: "Date & Time Picker", definition: "Timestamp of the very first outbound call attempt. Set once by STL Datetime Stamp workflow.", trigger: "'Clock Stop': Finalizes the Speed to Lead calculation.", used: "The raw data source for all STL dashboard reports." },
        { name: "Inbound Calls - Total", type: "Number", definition: "Count of times the lead called us inbound.", trigger: "Triggers a 'High Intent' tag on the contact record.", used: "Boosts the 'Activity Lead Score' for P4 views." },
        { name: "Last Inbound Call Date", type: "Date & Time Picker", definition: "Timestamp of the most recent inbound call from the lead.", trigger: "Triggers 'Nurture Refresh' logic.", used: "Smart View filtering." },
        { name: "Outbound SMS - Total", type: "Number", definition: "Count of all outbound SMS attempts.", trigger: "When = 1, same trigger logic as first outbound call.", used: "KPI Daily SMS Volume per rep." },
        { name: "Last Re-delegation From", type: "HubSpot User", definition: "Records who previously owned this lead before re-delegation.", trigger: "Triggers a 'New Assignment' Slack ping to the new owner.", used: "Manager View: identifies reps who are 'dropping the ball'." },
        { name: "Number of Re-delegations", type: "Number", definition: "Running total of how many times this lead has changed owner.", trigger: "If ≥3, triggers a Manager Intervention alert.", used: "Identifies 'Lead Burn' — leads being shuffled too many times." },
      ]
    },
    {
      group: "Speed To Lead",
      props: [
        { name: "Speed To Lead", type: "Calculation", definition: "Calculation: First Outbound Call Date minus Lead Delegated Date/Time Stamp. Raw duration in minutes/hours.", trigger: "Triggers the 'Range Stamp' automation to bucket the result.", used: "KPI 'Average Team Response Time'." },
        { name: "Speed To Lead Range Stamp", type: "Dropdown Select", definition: "Bucket: Less than 30 Mins | Less Than 2 Hours | Less Than 24 Hours | Between 24–48 Hours | More than 72 Hours.", trigger: "Written by Speed to Lead Range Stamp workflow (1758128504).", used: "Dashboard: Donut chart showing team performance distribution across buckets." },
        { name: "Outbound Call Date/Time After Last Opt-in", type: "Date & Time Picker", definition: "Captures the first dial attempt made after the contact's most recent opt-in (re-engagement cycle).", trigger: "Restarts STL measurement specifically for re-engaged leads.", used: "Re-engagement cycle STL efficiency reporting." },
      ]
    },
    {
      group: "Show Rate Engine — Contact Properties",
      props: [
        { name: "Discovery Call Confirmation Status", type: "Dropdown Select", definition: "Indicates if the prospect confirmed their Implementation/Discovery Call: Pending Confirmation | Confirmed | Never Confirmed | Canceled by Us | Canceled by Prospect.", trigger: "Written by Confirmation Disposition workflow (1755384621). Triggers Cancellation Disposition workflow when set to Canceled.", used: "Filter for 'Confirmed Specialist' Smart Views. Source for Confirmation Pipeline movement." },
        { name: "Closing Call Confirmation Status", type: "Dropdown Select", definition: "Indicates if the prospect confirmed their Strategy/Closing Session. Same values as Discovery.", trigger: "Written by Confirmation Disposition workflow. Triggers Cancellation Disposition workflow.", used: "Dashboard: tracks 'Confirmed Show Rate' vs. 'Total Show Rate'." },
        { name: "closer_follow_up_call_confirmation_status", type: "Dropdown Select", definition: "Confirmation status for Closer Follow Up calls.", trigger: "Written by Confirmation Disposition workflow for Follow Up branch.", used: "Confirmation Pipeline view for Follow Up calls." },
        { name: "setter_follow_up_call_confirmation_status", type: "Dropdown Select", definition: "Confirmation status for Setter Follow Up calls.", trigger: "Written by Confirmation Disposition workflow for Setter Follow Up branch.", used: "Confirmation Pipeline view for Setter Follow Up calls." },
      ]
    },
    {
      group: "Closer Engine — Contact Properties",
      props: [
        { name: "Closer Owner", type: "HubSpot User", definition: "The specific Closer assigned to the Strategy Session deal.", trigger: "Triggers the 'Closer Call Booked' Slack notification and assigns the Closer deal ownership.", used: "Used in 'Close Rate by Rep' and 'Closer Capacity' reports." },
        { name: "Latest Setter Call Zoom Link", type: "Single Line Text", definition: "The URL for the Zoom meeting for the most recent Setter Call.", trigger: "N/A (stored for reference).", used: "Allows Closers to review the Discovery call recording before their Strategy Session." },
        { name: "latest_closing_call_zoom_link", type: "Single Line Text", definition: "Zoom link for the most recent Closer Call.", trigger: "N/A.", used: "Sent to leads in confirmation messages." },
        { name: "Last Setter Call Booked (last_disco_call_booked)", type: "Date & Time Picker", definition: "Timestamp of when the Implementation call was booked.", trigger: "Triggers the Global Meeting Tool Sync. Copied to deal property by Stage Automation.", used: "Calculates the time gap between 'Opt-in' and 'Booked'." },
        { name: "Last Closing Call Date/Time (last_closing_call_datetime)", type: "Date & Time Picker", definition: "Start time of the most recently created Closer Call.", trigger: "Triggers the 5-minute 'In Progress' logic. Copied to deal by Stage Automation.", used: "Used for 'Calls Taken This Week' reporting." },
        { name: "last_closer_follow_up_call_datetime", type: "Date & Time Picker", definition: "Start time of the most recently created Closer Follow Up Call.", trigger: "Copied to deal by Stage Automation at Closer Follow Up Booked stage.", used: "Scheduling reports." },
        { name: "last_setter_follow_up_call_datetime", type: "Date & Time Picker", definition: "Start time of the most recently created Setter Follow Up Call.", trigger: "Copied to deal by Stage Automation at Setter Follow Up Booked stage.", used: "Scheduling reports." },
        { name: "discovery_call_outcome", type: "Dropdown Select", definition: "Outcome of the Discovery/Setter call. Written by Stage Automation workflow on relevant stage changes.", trigger: "Used in pipeline routing in the Stage Automation workflow.", used: "Pipeline and funnel reporting. Triggers Sync property to Appointment object." },
        { name: "closing_call_outcome", type: "Dropdown Select", definition: "Outcome of the Closer/Strategy call. Written by Stage Automation workflow.", trigger: "Used in pipeline routing. Triggers Sync property to Appointment object.", used: "Revenue reporting." },
        { name: "closer_follow_up_call_outcome", type: "Dropdown Select", definition: "Outcome of Closer Follow Up calls. Written by Stage Automation.", trigger: "Triggers Sync → Appointment for Final Disposition.", used: "Pipeline reporting." },
        { name: "setter_follow_up_call_outcome", type: "Dropdown Select", definition: "Outcome of Setter Follow Up calls. Written by Stage Automation.", trigger: "N/A.", used: "Pipeline reporting." },
        { name: "calendly_internal_note", type: "Single Line Text", definition: "The raw internal_note field from the Calendly Event Type. Format: 'Meeting Type - Booking Method - notes'. Written by the Calendly Integration workflow.", trigger: "Passed into the meeting type parser (action 8 in Calendly Integration workflow).", used: "Source field for parsing Meeting Type and Booking Method." },
        { name: "last_meetings_booking_method", type: "Dropdown Select", definition: "Parsed booking method from Calendly internal note: Inbound | Outbound. Set by Calendly Integration workflow.", trigger: "Written after branching on booking_method output.", used: "Attribution reporting: Inbound vs. Outbound booking rates." },
        { name: "last_meetings_cancel_link", type: "Single Line Text", definition: "Calendly cancel URL for the most recent booking. Written by Calendly Integration workflow.", trigger: "N/A.", used: "Included in confirmation messages to leads." },
        { name: "last_meetings_reschedule_link", type: "Single Line Text", definition: "Calendly reschedule URL for the most recent booking.", trigger: "N/A.", used: "Included in confirmation messages to leads." },
        { name: "last_meetings_unique_id", type: "Single Line Text", definition: "The external Google Calendar event ID for the most recent booking.", trigger: "Used by n8n to identify the Google Calendar event for deletions when a meeting is canceled.", used: "Integration deduplication and calendar sync." },
        { name: "booking_time_zone", type: "Single Line Text", definition: "IANA timezone of the lead at time of booking (e.g. 'America/New_York'). Written by Calendly Integration workflow from invitee data.", trigger: "N/A.", used: "Show on confirmation messages in lead's local time." },
        { name: "calendly_scheduled_event_uuid", type: "Single Line Text", definition: "UUID extracted from the Calendly scheduled event URI. Written by Calendly Integration workflow (action 24).", trigger: "N/A.", used: "Cross-referencing Calendly events for deduplication." },
        { name: "last_meeting_set_by_user", type: "HubSpot User", definition: "The HubSpot User ID of the rep who 'set' (booked) the most recent meeting via Calendly. Validated against the Owners API before writing.", trigger: "Written by Calendly Integration workflow (action 22).", used: "Attribution: which setter booked this call? Commission tracking." },
        { name: "currently_in_deal_creation", type: "Yes/No", definition: "Flag set to 'Yes' at the start of the Calendly Integration workflow (action 28). Set to 'No' at the end of the Big Brain workflow.", trigger: "Read by the Error Handler: if still 'Yes' after 3 min + URI is blank = workflow failed → Error Handler fires.", used: "Safety mechanism to detect failed booking flows." },
        { name: "calendly_scheduled_event_uri", type: "Single Line Text", definition: "The Calendly event URI for the most recent booking. Written by Zapier, read by Big Brain and Calendly Integration workflows, then cleared.", trigger: "Read by both the Calendly Integration and Big Brain workflows. Checked by Error Handler workflow.", used: "Integration field — do not edit manually." },
        { name: "calendly_event_type_uri", type: "Single Line Text", definition: "Calendly event type URI identifying which scheduling link was used. Written by Zapier.", trigger: "Read by Calendly Integration workflow (action 6) to fetch internal_note.", used: "Integration field — determines meeting type routing." },
        { name: "lead_refresh_active", type: "Yes/No", definition: "Flag that temporarily hides a lead from Smart Views during a cooldown period.", trigger: "Set by Lead Refresh workflow. All Smart Views filter: lead_refresh_active ≠ Yes.", used: "Call cadence management." },
        { name: "meeting_type_of_last_booking", type: "Text", definition: "Records what type of meeting was most recently booked for this contact.", trigger: "Triggers the Global Meetings Tool Sync and SM Global Meetings Tool Sync workflows.", used: "Determines which branch fires in the Big Brain workflow." },
      ]
    }
  ],

  deal: [
    {
      group: "Closer Engine — Rep Attribution",
      props: [
        { name: "Setter Owner / sdr_owner", type: "HubSpot User", definition: "The specific rep who qualified and 'set' the Closer call. Written by Stage Automation workflow (actions 106, 120) from contact's sdr_owner.", trigger: "Commission attribution on the deal. Written at Setter Call Booked and Setter Follow Up Booked stages.", used: "Lead board — 'Sets by Rep' and 'Closer-to-Closed Won' attribution." },
        { name: "Closer Owner / hubspot_owner_id", type: "HubSpot User", definition: "The Closer assigned to the Strategy Session deal. Written by Stage Automation from contact's closer_owner field at Closing Call Booked stage.", trigger: "Assigns deal ownership. Triggers Slack notification.", used: "Deal board ownership and all Closer performance reports." },
      ]
    },
    {
      group: "Closer Engine — Call Outcomes",
      props: [
        { name: "discovery_call_outcome (deal)", type: "Dropdown Select", definition: "Outcome of the Setter/Discovery call mirrored to the deal. Values: Scheduled | Completed | Canceled by Us | Canceled by Prospect | No Show | In Progress.", trigger: "Written at almost every stage change by Stage Automation.", used: "Data source for all Conversion and Show Rate reports." },
        { name: "closing_call_outcome / closer_call_outcome (deal)", type: "Dropdown Select", definition: "Outcome of the Closer/Strategy Session on the deal.", trigger: "Written by Stage Automation across Closing Call stages.", used: "Revenue reporting and stage routing." },
        { name: "closer_follow_up_call_outcome (deal)", type: "Dropdown Select", definition: "Outcome of Closer Follow Up calls on the deal.", trigger: "Written by Stage Automation at Closer Follow Up Booked stage.", used: "Pipeline reporting." },
        { name: "disco__no_show__cancel_type", type: "Dropdown Select", definition: "Required field when moving to Setter No Show/Cancel stage: Canceled by Us | Canceled by Prospect | No Show | Rescheduled.", trigger: "Read by Stage Automation action 18 to determine which outcome path to take.", used: "Dashboard: 'Cancellation Source' analysis." },
        { name: "closing__no_show__cancel_type", type: "Dropdown Select", definition: "Required field when moving to Closing No Show/Cancel stage.", trigger: "Read by Stage Automation action 35.", used: "Dashboard analysis." },
        { name: "disco_call__dq_reason", type: "Multiple Checkboxes", definition: "Why a lead was disqualified at the Setter stage: Financially Unqualified | Not a fit | Decision Maker Not Present | Other.", trigger: "Read by Stage Automation action 53 (list branch) to route DQ deals.", used: "Dashboard: Identifies 'Junk Lead' patterns by funnel source." },
        { name: "closing_call__dq_reason", type: "Single Line Text", definition: "Free-text field where the Closer explains why a lead that passed the Setter was still rejected.", trigger: "Read by Stage Automation action 53 (second list branch).", used: "Manager Review: Auditing Setter quality vs. Closer discernment." },
        { name: "closer_follow_up_call__no_show__cancel_type", type: "Dropdown Select", definition: "No-show/cancel type for Closer Follow Up calls.", trigger: "Written by Cancellation Disposition workflow for Follow Up appointments.", used: "Pipeline and cancellation reporting." },
        { name: "closer_follow_up_call__dq_reason", type: "Single Line Text", definition: "DQ reason for Closer Follow Up calls when cancellation_reason = Disqualified.", trigger: "Written by Cancellation Disposition workflow when DQ path fires.", used: "DQ reporting for Follow Up stage." },
      ]
    },
    {
      group: "Closer Engine — Appointment Datetimes",
      props: [
        { name: "discovery_call_booked_date__time", type: "Date & Time Picker", definition: "Copied from contact's 'last_disco_call_booked' by Stage Automation (action 2) when deal moves to Setter Call Booked.", trigger: "Triggers the 5-minute 'In Progress' status and meeting cleanup logic.", used: "Source of truth for all 'Calls Scheduled' reports." },
        { name: "closer_call_booked_date__time", type: "Date & Time Picker", definition: "Copied from contact's 'last_closing_call_datetime' by Stage Automation (action 8) when deal moves to Closing Call Booked.", trigger: "Same as above — 5-minute In Progress + cleanup.", used: "Source of truth for Closer call reports." },
        { name: "disco_call_no_show_date", type: "Date Picker", definition: "Stamped by Stage Automation (action 25) when Setter No Show occurs.", trigger: "Triggers 'No Show ReBook' automated email/SMS sequence.", used: "Dashboard: Track No Show trends by day of the week." },
        { name: "closing_call_no_show_date", type: "Date Picker", definition: "Stamped by Stage Automation (action 42) when Closing No Show occurs.", trigger: "Triggers 'No Show ReBook' sequence.", used: "Dashboard No Show trend tracking." },
        { name: "closer_follow_up_call_datetime", type: "Date & Time Picker", definition: "Copied from contact's 'last_closer_follow_up_call_datetime' by Stage Automation at Closer Follow Up Booked.", trigger: "In Progress and cleanup logic.", used: "Scheduling reports." },
        { name: "setter_follow_up_call_datetime", type: "Date & Time Picker", definition: "Copied from contact's 'last_setter_follow_up_call_datetime' by Stage Automation at Setter Follow Up Booked.", trigger: "In Progress and cleanup logic.", used: "Scheduling reports." },
      ]
    },
    {
      group: "Closer Engine — Deal Management",
      props: [
        { name: "offer_made_", type: "Single Checkbox (Yes/No)", definition: "Confirms that a pitch was delivered and the price was presented. Set to 'Yes' at Red Zone, Closed Won, and Closed Lost stages.", trigger: "Required for Red Zone and Nurture stages. Triggers the date stamp.", used: "KPI 'Offer Rate': Total Calls vs. Total Pitches." },
        { name: "offer_made_date", type: "Date Picker", definition: "When the pitch was delivered. Stamped when offer_made_ is first set.", trigger: "Auto-stamps when 'Offer Made' is first checked. Skipped if date already known.", used: "Timeline analysis for pitch-to-close velocity." },
        { name: "Red Zone Type", type: "Multiple Checkboxes", definition: "Categorizes high-probability deals: Submitted Deposit | Verbally Committed to Moving Forward | Follow Up Scheduled.", trigger: "Required field when moving to Red Zone stage.", used: "Dashboard: Show forecasted 'Likely to Close' revenue for the week." },
        { name: "Nurture Type", type: "Dropdown Select", definition: "Distinguishes whether a stalled deal is owned by the Setter (Setter Nurture) or Closer (Closer Nurture).", trigger: "Required when moving to Setter Qualified/Nurture or Closing Qualified/Nurture stages.", used: "Setter Nurture vs. Closer Nurture pipeline views." },
        { name: "Expected Close Date", type: "Date Picker", definition: "The rep's predicted date for when payment will be completed.", trigger: "Required for Red Zone stage. If the date passes without a win, triggers the 'Re-Risk Deal' label.", used: "Weekly revenue projections and deal deadline pipeline." },
        { name: "Deal Type", type: "Radio Select", definition: "New Business | Existing Business | Front End Offer | Back End Offer | Other.", trigger: "Required field for Red Zone, Pending Approval, Closed Won, and Closed Lost stages.", used: "Revenue breakdown by product line." },
        { name: "Setter - Next Touch Date (Nurture) / setter_nurture_date", type: "Date Picker", definition: "The 'Next Touch Date' for deals in Setter Nurture.", trigger: "Required when selecting Setter Nurture. If blank or past = deal considered Lost.", used: "Setter Nurture saved view, sorted by this date." },
        { name: "Closer - Next Touch Date (Nurture) / closer__next_touch_date_nurture", type: "Date Picker", definition: "The 'Next Touch Date' for deals in Closer Nurture. MUST be updated every time you touch a nurture deal.", trigger: "Required when selecting Closer Nurture. If blank or past = deal considered Lost.", used: "Closer Nurture saved view, sorted by this date." },
        { name: "hs_unique_id (on Meeting object)", type: "Single Line Text", definition: "Written by the Calendly Integration workflow (action 13) — stores the Google Calendar external event ID on the HubSpot meeting record.", trigger: "Written by custom code action 13. Read by duplicate cleaner action 27.", used: "Deduplication between Calendly and Google Calendar sync meetings." },
      ]
    },
    {
      group: "Pending Approval & Payment Properties",
      props: [
        { name: "Amount", type: "Currency", definition: "The total deal value. Required when moving to Pending Approval, Closed Won, or Closed Lost.", trigger: "Required gatekeeper field for terminal stages.", used: "Revenue reporting, quota tracking, commission calculations." },
        { name: "Was Financing Used?", type: "Dropdown Select", definition: "How the client paid: Yes, Affirm | Yes, Klarna | Yes, SplitIt | No.", trigger: "Required field at Pending Approval stage.", used: "Finance tracking — distinguishes cash vs. financed revenue." },
        { name: "What type of lead is this?", type: "Dropdown Select", definition: "Deal origin: One Call Close | Follow Up / Pipeline | Outbound Self Set.", trigger: "Required field at Pending Approval stage.", used: "Performance analysis — one-call-close rate vs. multi-touch." },
        { name: "Payment Plan", type: "Dropdown Select", definition: "Payment structure: PIF | Affirm PIF | 3 Pay | VIP Foundations - 90 Day | 3 Month x4 | 6 Month x2 | 12 Month | Special Arrangement | VIP - BFCM - PIF - 6200 | VIP - BFCM - 2300 down 3900.", trigger: "Required field at Pending Approval stage.", used: "Finance team tracking. Determines collection schedule." },
        { name: "Payment Special Arrangement Description", type: "Single Line Text", definition: "Free-text description when 'Special Arrangement' is selected as the payment plan.", trigger: "Required only if Payment Plan = Special Arrangement.", used: "Finance team reviews for non-standard payment terms." },
        { name: "Quote Link", type: "Single Line Text", definition: "URL to the HubSpot Quote or payment page for this deal.", trigger: "N/A (manually set).", used: "Quick access for reps to resend payment links. Included in Red Zone Slack notifications." },
        { name: "Up Front Cash Collected", type: "Number (Currency)", definition: "The actual dollar amount paid today (first installment or full payment).", trigger: "Syncs to the PIK (Payment in Kind) log.", used: "KPI 'Cash-in-Door' vs. 'Total Contract Value'." },
        { name: "Closing Conditions Met", type: "Multiple Checkboxes", definition: "Agreement Signed | Payment Made. BOTH must be checked before moving to Closed Won.", trigger: "The Gatekeeper: Deal cannot move to Closed Won until both are checked.", used: "Prevents premature closed-won deals before payment is confirmed." },
      ]
    }
  ]
};

// ============================================================
// PIPELINES
// ============================================================
WB.pipelines = {
  deal: {
    id: "840860960",
    name: "Sales Momentum Pipeline",
    object: "Deal",
    description: "The primary deal pipeline tracking every prospect from first setter call through to closed won. 13 stages covering the full sales journey. Stages marked AUTO should never be moved manually — they are set exclusively by scheduling links and workflow automations. Each stage has specific 'Conditional Stage Properties' that act as gatekeepers — they must be filled before the deal can move.",
    stages: [
      {
        group: "Setter Funnel — Auto Stages (Scheduling Links ONLY)",
        groupNote: "⚠️ Do NOT move these stages manually. They are set exclusively by scheduling links.",
        stages: [
          {
            name: "Setter Call Booked",
            probability: "10%",
            type: "auto",
            moveRule: "DO NOT move manually. Set automatically when a prospect books a Setter Call via scheduling link.",
            conditional: "No conditional properties — this stage is set by automation only.",
            conditionalOptions: [],
            desc: "A Setter/Implementation call has been scheduled. The Big Brain workflow created the Appointment record and moved the deal here automatically.",
            triggers: "Big Brain workflow fires. Appointment object created. Zoom link written to Contact. Slack notification sent to #confirmation-channel. Stage Automation copies last_disco_call_booked datetime + sets discovery_call_outcome = Scheduled."
          },
          {
            name: "Setter Follow Up Call Booked",
            probability: "20%",
            type: "auto",
            moveRule: "DO NOT move manually. Set automatically when a Setter Follow Up is booked via scheduling link.",
            conditional: "No conditional properties — this stage is set by automation only.",
            conditionalOptions: [],
            desc: "A follow-up Setter Call has been scheduled. Used when the lead needs more time or context before moving to a Closer call.",
            triggers: "Big Brain workflow fires on Setter Follow Up booking. New Appointment record created. Stage Automation copies setter_follow_up_call_datetime."
          },
        ]
      },
      {
        group: "Setter Funnel — Manual Outcome Stages",
        groupNote: "These stages are moved manually by Setters after an outcome occurs.",
        stages: [
          {
            name: "Setter No Show / Canceled",
            probability: "10%",
            type: "manual",
            moveRule: "Setter moves deal here after a missed or canceled Implementation call.",
            conditional: "REQUIRED — Must select one of the following before moving:",
            conditionalOptions: ["Canceled by Us", "Canceled by Prospect", "No Show"],
            desc: "The Setter Call was missed or canceled. The rep must document the reason. This distinction matters — 'Canceled by Us' vs 'No Show' feeds different report segments.",
            triggers: "Stage Automation sets Contact Lead Status = NO_SHOW/CANCEL. Branches on disco__no_show__cancel_type and writes matching outcome values. No Show: stamps disco_call_no_show_date."
          },
          {
            name: "Setter Qualified / Nurture",
            probability: "20%",
            type: "manual",
            moveRule: "Setter moves here when the lead was qualified but not immediately booked into a Closer Call.",
            conditional: "REQUIRED — Must choose a nurture type AND fill the corresponding date:",
            conditionalOptions: [
              "Setter Nurture → then fill: Setter - Next Touch Date (Nurture)",
              "Closer Nurture → then fill: Closer - Next Touch Date (Nurture)"
            ],
            desc: "Qualified lead who needs follow-up before booking a Closer. Short-term holding stage. A concrete Next Touch Date is mandatory — if left blank, the deal is treated as Lost in Nurture views.",
            triggers: "Stage Automation sets discovery_call_outcome = Completed on deal and contact. Contact Lifecycle → salesqualifiedlead. Contact Lead Status → IN_PROGRESS."
          },
          {
            name: "DQ",
            probability: "0% (Lost)",
            type: "lost",
            moveRule: "Setter or Closer moves here when a lead is disqualified at any stage of the funnel.",
            conditional: "REQUIRED — Must fill ONE of the following:",
            conditionalOptions: [
              "Setter Call - DQ Reason (Dropdown): Financially Unqualified",
              "Setter Call - DQ Reason (Dropdown): Not a fit for Product/Service",
              "Setter Call - DQ Reason (Dropdown): Decision Maker Not Present",
              "Setter Call - DQ Reason (Dropdown): Other",
              "Closing Call - DQ Reason (Text Box): free-text explanation"
            ],
            desc: "Lead is disqualified and removed from the active pipeline. If disqualified at the Setter stage, use the dropdown. If disqualified at the Closer stage, use the text box.",
            triggers: "Stage Automation (action 53) detects which DQ reason field is filled and routes accordingly. Setter DQ: discovery outcomes = Completed, Contact Lead Status = UNQUALIFIED. Closer DQ: closing outcomes written, Contact Lead Status = UNQUALIFIED."
          },
        ]
      },
      {
        group: "Closer Funnel — Auto Stages (Scheduling Links ONLY)",
        groupNote: "⚠️ Do NOT move these stages manually. They are set exclusively by scheduling links.",
        stages: [
          {
            name: "Closing Call Booked",
            probability: "30%",
            type: "auto",
            moveRule: "DO NOT move manually. Set automatically when a Closer Call is booked via scheduling link.",
            conditional: "No conditional properties — this stage is set by automation only.",
            conditionalOptions: [],
            desc: "A Closer/Strategy Session has been scheduled. The Big Brain workflow moved the deal here when the Setter booked the Closer Call via Calendly.",
            triggers: "Big Brain workflow fires. Appointment object created. Closer assigned. Slack notification to #confirmation-channel. Stage Automation copies last_closing_call_datetime + assigns deal owner from closer_owner."
          },
          {
            name: "Closing Follow Up Call Booked",
            probability: "40%",
            type: "auto",
            moveRule: "DO NOT move manually. Set automatically when a Closer Follow Up is booked via scheduling link.",
            conditional: "No conditional properties — this stage is set by automation only.",
            conditionalOptions: [],
            desc: "A follow-up Closer Call has been scheduled for a Red Zone or Nurture deal.",
            triggers: "Big Brain workflow fires on Closer Follow Up booking. New Appointment record created. Stage Automation copies last_closer_follow_up_call_datetime."
          },
        ]
      },
      {
        group: "Closer Funnel — Manual Outcome Stages",
        groupNote: "These stages are moved manually by Closers after an outcome occurs.",
        stages: [
          {
            name: "Closing Call No Show / Canceled",
            probability: "10%",
            type: "manual",
            moveRule: "Closer moves deal here after a missed or canceled Strategy Session.",
            conditional: "REQUIRED — Must select one of the following before moving:",
            conditionalOptions: ["Canceled by Us", "Canceled by Prospect", "No Show"],
            desc: "The Closer Call was missed or canceled. Reason must be documented to feed show rate and cancellation source reporting.",
            triggers: "Stage Automation sets Contact Lead Status = NO_SHOW/CANCEL. Branches on closing__no_show__cancel_type. No Show: stamps closing_call_no_show_date."
          },
          {
            name: "Closing Qualified / Nurture",
            probability: "40%",
            type: "manual",
            moveRule: "Closer moves here when a lead is qualified but needs follow-up before closing.",
            conditional: "REQUIRED — Must choose a nurture type AND fill the corresponding date:",
            conditionalOptions: [
              "Setter Nurture → then fill: Setter - Next Touch Date (Nurture)",
              "Closer Nurture → then fill: Closer - Next Touch Date (Nurture)"
            ],
            desc: "Qualified lead who has been through a Closer Call but needs more time. Must set a concrete Next Touch Date.",
            triggers: "Stage Automation sets closer_call_outcome = Canceled by Team, contact closing_call_outcome = Completed, contact Lifecycle = opportunity, contact Lead Status = OPEN_DEAL. Stamps offer_made_date."
          },
          {
            name: "Red Zone",
            probability: "80%",
            type: "manual",
            moveRule: "Closer moves here when a deal is closing within 1–14 days. This is the highest-priority manual stage.",
            conditional: "REQUIRED — Must fill ALL 3 fields before moving:",
            conditionalOptions: [
              "Deal Type: New Business | Existing Business | Front End Offer | Back End Offer | Other",
              "Red Zone Type: Submitted Deposit | Verbally Committed to Moving Forward | Follow Up Scheduled",
              "Expected Close Date: (specific date required)"
            ],
            desc: "Deal is on the 1-yard line. All three conditional fields are mandatory gatekeepers — no exceptions. After this, the deal appears in forecasting reports for likely weekly revenue.",
            triggers: "Stage Automation: Posts 🚩🚩 NEW RED-ZONE Slack alert to C0ADDPT64BE. Sets deal closer_call_outcome = Canceled by Team. Contact Lead Status = RED_ZONE. Stamps offer_made_date. Sets offer_made_ = Yes."
          },
        ]
      },
      {
        group: "Final Approval & Terminal Stages",
        groupNote: "These stages represent the end states of a deal — approval, win, or loss.",
        stages: [
          {
            name: "Pending Approval",
            probability: "90%",
            type: "manual",
            moveRule: "Closer moves here when a deal is verbally committed and payment details are being finalized.",
            conditional: "REQUIRED — Must fill ALL 5 fields before moving:",
            conditionalOptions: [
              "Amount: (dollar amount required)",
              "Was Financing Used? Yes, Affirm | Yes, Klarna | Yes, SplitIt | No",
              "What type of lead is this? One Call Close | Follow Up / Pipeline | Outbound Self Set",
              "Payment Plan: PIF | Affirm PIF | 3 Pay | VIP Foundations - 90 Day | 3 Month x4 | 6 Month x2 | 12 Month | Special Arrangement | VIP - BFCM - PIF - 6200 | VIP - BFCM - 2300 down 3900",
              "Payment Special Arrangement Description: (only if Special Arrangement selected)"
            ],
            desc: "Deal is in final approval. All payment details must be documented. Finance team references this stage for collection planning.",
            triggers: "Stage Automation fires Zapier webhook → Slack #Sales-Approval notification. Closing Conditions Met checkboxes (Agreement Signed + Payment Made) must BOTH be ticked before moving to Closed Won."
          },
          {
            name: "Closed Won",
            probability: "100% (Won)",
            type: "won",
            moveRule: "Move here ONLY after both Closing Conditions Met boxes are ticked: Agreement Signed ✓ AND Payment Made ✓.",
            conditional: "REQUIRED — Both Deal Type and Amount must be filled. Both Closing Conditions Met checkboxes must be checked.",
            conditionalOptions: [
              "Deal Type: (required)",
              "Amount: (required)",
              "Closing Conditions: Agreement Signed ✓",
              "Closing Conditions: Payment Made ✓"
            ],
            desc: "Deal is paid and signed. Client is onboarded. This is the final stage that feeds all revenue attribution, commission tracking, and the external finance sheet.",
            triggers: "Stage Automation: Sets contact marketing email subscription (OPT_IN). Contact Lifecycle = customer. Contact Lead Status = CLOSED_WON. Stamps closedate = now. Fires Zapier webhook for win notification."
          },
          {
            name: "Closed Lost",
            probability: "0% (Lost)",
            type: "lost",
            moveRule: "Move here when a deal is permanently closed without a purchase and no further follow-up is planned.",
            conditional: "REQUIRED — Deal Type and Amount must be filled.",
            conditionalOptions: [
              "Deal Type: (required)",
              "Amount: (required)"
            ],
            desc: "Deal is permanently closed without a purchase. Lead is removed from active pipeline views and enters loss reason reporting.",
            triggers: "Stage Automation: Contact Lead Status = CLOSED_LOST. Contact Lifecycle = opportunity. Stamps offer_made_date. Association label changed."
          },
        ]
      }
    ]
  },

  appointment: {
    id: "850614794",
    name: "Confirmation Pipeline",
    object: "Appointment",
    description: "All appointment records flow through this pipeline automatically. Reps should NEVER manually drag appointment cards between stages. Instead, reps update two key properties: (1) 'Closing Call Confirmation List' to update confirmation status, and (2) 'Final Outcome of Appointment' after the call occurs. The pipeline stage moves automatically based on these property changes.",
    stages: [
      {
        group: "Active Appointment Stages",
        groupNote: "All stages in this group are managed automatically. Do not move manually.",
        stages: [
          {
            name: "Upcoming Appointments",
            type: "auto",
            desc: "Default stage for all newly created appointment records. Every booking lands here first automatically.",
            conditional: "No action required. System places records here automatically.",
            conditionalOptions: [],
            triggers: "Auto-set by 'Global Big Brain' workflow when Appointment is created.",
            moveRule: "Do not move manually.",
            status: "Open"
          },
          {
            name: "Scheduled (<48 Hours Out)",
            type: "auto",
            desc: "Appointment is 24–48 hours away. Contacts in List 2381 (Unconfirmed <48h) trigger this stage via the Confirmation List + Confirmation Disposition workflows.",
            conditional: "Auto-set by Confirmation Disposition workflow when setter_confirmation_list or closing_call_confirmation_list = 'Unconfirmed - <48 Hours'.",
            conditionalOptions: [],
            triggers: "Triggered by list membership in List 2381.",
            moveRule: "Do not move manually.",
            status: "Open"
          },
          {
            name: "Scheduled (<24 Hours Out)",
            type: "auto",
            desc: "Appointment is under 24 hours away and still unconfirmed. Highest urgency for confirmation outreach.",
            conditional: "Auto-set when confirmation list = 'Unconfirmed - <24 Hours' (List 2380).",
            conditionalOptions: [],
            triggers: "Triggered by list membership in List 2380. Pipeline stage ID: 1268114333.",
            moveRule: "Do not move manually.",
            status: "Open"
          },
          {
            name: "Confirmed",
            type: "auto",
            desc: "Lead verbally confirmed their appointment. Rep updates the 'Closing Call Confirmation List' property to 'Upcoming Confirmed Appointments' to trigger this.",
            conditional: "Rep updates confirmation list property → 'Upcoming Confirmed Appointments'. Pipeline stage follows automatically.",
            conditionalOptions: ["Confirmation Disposition workflow detects confirmed status and moves stage (ID: 1269136023)"],
            triggers: "Auto-moved when Confirmation List = 'Upcoming Confirmed Appointments'. Stamps datetime_confirmed. Powers 'Confirmed Show Rate' metric on dashboard.",
            moveRule: "Do not drag manually. Update the 'Confirmation Stage' property instead.",
            status: "Closed",
            id: "1269136023"
          },
          {
            name: "Never Confirmed",
            type: "auto",
            desc: "Appointment time has passed with no confirmation recorded. System auto-moves records here to flag missed confirmations for reporting.",
            conditional: "Auto-moved by time-based logic: appointment time passed AND confirmation status still blank or unconfirmed.",
            conditionalOptions: [],
            triggers: "Auto-moved when confirmation list = 'Never Confirmed' (List 2392). Pipeline stage ID: 1269136024.",
            moveRule: "Do not move manually.",
            status: "Closed",
            id: "1269136024"
          },
          {
            name: "In Progress",
            type: "auto",
            desc: "The appointment is actively happening right now. Set 5 minutes before start time by the 'Appointment — In Progress?' workflow.",
            conditional: "No action required. System auto-sets this 5 minutes before the scheduled start time.",
            conditionalOptions: [],
            triggers: "Auto-set by 'Appointment — In Progress?' workflow (1770760586) when time_until_appointment < 5 minutes.",
            moveRule: "Do not move manually.",
            status: "Open",
            id: "1268114331"
          },
        ]
      },
      {
        group: "Past Appointment Stages",
        groupNote: "Records move here automatically when a rep sets the 'Final Outcome of Appointment' property.",
        stages: [
          {
            name: "Past (Completed)",
            type: "auto",
            desc: "Appointment happened and was completed. Rep must set 'Final Outcome of Appointment' = Completed on the Appointment record to trigger this move.",
            conditional: "Rep sets 'Final Outcome of Appointment' = Completed on the Appointment record.",
            conditionalOptions: ["Set property: Final Outcome of Appointment → Completed"],
            triggers: "Auto-moved by Final Appointment Disposition workflow (1755975999) when outcome = Completed. Association label swaps to 'Past Disco' or 'Past Closer'. Record archived from active views.",
            moveRule: "Do not drag manually. Set the 'Final Outcome of Appointment' property.",
            status: "Closed"
          },
          {
            name: "Past (No Show / Canceled)",
            type: "auto",
            desc: "Appointment resulted in a No Show or Cancellation. Rep must set 'Final Outcome of Appointment' to the appropriate value.",
            conditional: "Rep sets 'Final Outcome of Appointment' = No Show, Canceled by Us, or Canceled by Them.",
            conditionalOptions: [
              "Set property: Final Outcome of Appointment → No Show",
              "Set property: Final Outcome of Appointment → Canceled by Us",
              "Set property: Final Outcome of Appointment → Canceled by Them"
            ],
            triggers: "Auto-moved by Final Appointment Disposition workflow. Association label swaps to 'Past Disco' or 'Past Closer'. Removed from active confirmation queue.",
            moveRule: "Do not drag manually. Set the 'Final Outcome of Appointment' property.",
            status: "Closed"
          },
          {
            name: "Rescheduled",
            type: "auto",
            desc: "Appointment was rescheduled. Final Disposition workflow sets this stage when sync outcome = Rescheduled.",
            conditional: "Auto-set by Final Disposition workflow when outcome = Rescheduled.",
            conditionalOptions: [],
            triggers: "Auto-moved by Final Appointment Disposition workflow (stage ID: 1278790583). Association labels updated.",
            moveRule: "Do not move manually.",
            status: "Open",
            id: "1278790583"
          },
          {
            name: "Canceled by Us",
            type: "auto",
            desc: "Appointment was canceled by the team/rep during the confirmation process.",
            conditional: "Set by Cancellation Disposition workflow when 'Canceled by Us' path fires. Pipeline stage ID: 1268114334.",
            conditionalOptions: [],
            triggers: "Cancellation Disposition workflow (1755406259). Deal moved to corresponding No Show/Cancel stage.",
            moveRule: "Do not move manually.",
            status: "Closed",
            id: "1268114334"
          },
          {
            name: "Canceled by Them",
            type: "auto",
            desc: "Appointment was canceled by the prospect during the confirmation process.",
            conditional: "Set by Cancellation Disposition workflow when 'Canceled by Prospect' path fires. Pipeline stage ID: 1268114335.",
            conditionalOptions: [],
            triggers: "Cancellation Disposition workflow (1755406259). Deal moved to corresponding No Show/Cancel stage.",
            moveRule: "Do not move manually.",
            status: "Closed",
            id: "1268114335"
          },
        ]
      }
    ]
  }
};

// ============================================================
// LEAD STATUSES
// ============================================================
WB.leadStatuses = [
  { status: "NEW", color: "green", def: "Fresh opt-in. Not yet contacted. Highest priority — appears in P1 Smart View." },
  { status: "PROSPECTING", color: "blue", def: "Contact attempted but no meaningful conversation yet. Still in active dialing queue." },
  { status: "IN_PROGRESS", color: "amber", def: "Meaningful conversation had — not yet booked. Triggers SQL lifecycle upgrade. Appears in P2 Smart View." },
  { status: "MEETING_BOOKED", color: "green", def: "Discovery or Closer call is on the calendar. Managed by the Show Rate Engine." },
  { status: "OPEN_DEAL", color: "blue", def: "Active deal in the pipeline. Closer is managing." },
  { status: "BAD_TIMING", color: "orange", def: "Lead explicitly said to call back later. Re-enters queue after specified time." },
  { status: "NO_PROGRESS", color: "gray", def: "Multiple attempts made with no engagement. Will cycle back based on activity score." },
  { status: "NO_SHOW/CANCEL", color: "red", def: "Appointment was missed or canceled. Reactivation sequence triggered." },
  { status: "UNQUALIFIED", color: "red", def: "Lead does not meet minimum criteria (e.g., investment < $1k). Removed from setter queue." },
  { status: "DECAYING", color: "orange", def: "Lead was once active but is losing engagement. Low-priority re-engagement." },
  { status: "RED_ZONE", color: "red", def: "Deal is on the 1-yard line. Closing within 1–14 days. Highest Closer priority." },
  { status: "CLOSED_WON", color: "green", def: "Client. Deal paid and signed. Removed from sales pipeline." },
  { status: "CLOSED_LOST", color: "gray", def: "Permanently closed without purchase." },
  { status: "BAD_DATA", color: "gray", def: "Invalid contact information (wrong number, bad email). Removed from dialing queue." },
  { status: "DO_NOT_CONTACT", color: "red", def: "Lead has opted out or requested no contact. Never dial." },
  { status: "BLACKLISTED_CUSTOMER", color: "red", def: "Former client who should not be re-sold to." },
  { status: "REPEAT_CUSTOMER", color: "green", def: "Existing client purchasing an additional product." },
  { status: "CONTACT (NON-LEAD)", color: "gray", def: "Person in the system who is not a sales lead (e.g., team member, partner, vendor)." },
];

// ============================================================
// LISTS & VIEWS
// ============================================================
WB.lists = [
  { type: "static", id: "2079", name: "All Opt-ins", desc: "Master list of every lead who submitted an opt-in form, regardless of funnel. Used as the base universe for all lead-level reporting." },
  { type: "static", id: "2173", name: "VSL Funnel — Opt-ins", desc: "Leads who entered through the Video Sales Letter funnel. Used in funnel-specific reporting and Delegation Date/Time branching." },
  { type: "static", id: "2174", name: "Quiz Funnel — Opt-ins", desc: "Leads who entered through the Quiz funnel. Used in funnel-specific reporting and Delegation Date/Time branching." },
  { type: "static", id: "2170", name: "PQL — Product Qualified Leads", desc: "Contacts who have completed a Low-Ticket purchase. Highest-intent lead segment. Added by 'PQL Helper Workflow'. Triggers priority dialing treatment." },
  { type: "static", id: "2371", name: "Closer Nurture List", desc: "Contacts with deals in 'Closing Qualified/Nurture' stage with Closer Nurture type. Enrolled into the 'Closer Engine — Communication — Closer Nurture' workflow for automated nurture emails." },
  { type: "active", id: "2212", name: "Lead Refresh Cooldown", desc: "Active list used by Lead Refresh workflows. Contains contacts where 'lead_refresh_active = Yes'. Smart Views filter these contacts OUT so setters don't repeatedly redial the same lead within the cooldown window." },
  { type: "active", id: "2379", name: "Upcoming Appointments (>48 Hours)", desc: "Show Rate Engine list. All appointments more than 48 hours away. Contacts exit this list when within 48 hours. Triggers Confirmation List workflow." },
  { type: "active", id: "2381", name: "Upcoming Unconfirmed (24–48 Hours)", desc: "Show Rate Engine list. Appointment is 24–48 hours away and not yet confirmed. Triggers 'Stronger Nudge' pre-call email + optional SMS." },
  { type: "active", id: "2380", name: "Upcoming Unconfirmed (<24 Hours)", desc: "Show Rate Engine list. Appointment is under 24 hours away and not yet confirmed. Highest urgency — triggers urgent SMS track." },
  { type: "active", id: "2382", name: "Upcoming Confirmed Appointments", desc: "Show Rate Engine list. Lead has confirmed their appointment. Triggers 'Thanks for confirming' email and prep/logistics sequence." },
  { type: "active", id: "2392", name: "Never Confirmed Appointments", desc: "Show Rate Engine list. Appointment time passed with no confirmation recorded. Feeds Never Confirmed stage in Confirmation Pipeline." },
  { type: "active", name: "P1 — New Hot Leads Smart View", desc: "Dynamic Smart View. Filters: Setter Owner = Me + Lead Status = NEW + Created Today + Lead Refresh Active ≠ Yes + Lead Score (sorted desc). The highest priority dialing queue — these are fresh opt-ins." },
  { type: "active", name: "P2 — Follow-Ups Smart View", desc: "Contacts with Lead Status = IN_PROGRESS. Meaningful conversation started but no call booked yet. Second-priority dialing queue." },
  { type: "active", name: "P3 — Active Re-Engagement Smart View", desc: "Older leads with recent activity signals (email opens, site visits). Lead Score ≥ threshold. Third-priority dialing queue." },
  { type: "active", name: "P4 — Cold Leads Smart View", desc: "Older leads with PROSPECTING or BAD_TIMING status. Lowest priority but still worth dialing on slow days." },
  { type: "active", name: "Closer Pipeline — Red Zone View", desc: "Saved view showing all deals in 'Red Zone' stage sorted by Expected Close Date. Priority 1 in the Closer's daily workflow after active appointments." },
  { type: "active", name: "Closer Pipeline — Nurture View", desc: "Saved view of all Nurture deals sorted by 'Next Touch Date'. If Next Touch Date is today or past → reach out immediately. If blank → deal is treated as Lost." },
  { type: "active", name: "Confirmation View", desc: "Appointment object view filtered to 'Confirmation Owner = Me'. Shows: Appointment name, Lead phone number, Confirmation Stage, Appointment date/time. Rep bookmarks this and works from it daily." },
];

// ============================================================
// SLACK CHANNELS
// ============================================================
WB.slack = [
  {
    channel: "#confirmation-channel",
    id: "C0ADDPT64BE",
    purpose: "Booking notifications. Every new meeting fires here. The team uses this to claim confirmation ownership. Also receives Red Zone deal alerts.",
    fires: [
      "New Setter Call booked → Full booking alert (Closer, Setter, Lead name, email, phone, line type, validation, LT purchased?, LT date) + 'Claim Confirmation' button + 'Go to Appointment' link.",
      "New Closer Call booked → Same full booking alert.",
      "New Setter Follow Up booked → Booking alert.",
      "New Closer Follow Up booked → Booking alert.",
      "Deal moves to Red Zone → 🚩🚩 NEW RED-ZONE alert with Babe's Name, SP Owner, SDR Owner, Deal Link.",
      "All booking alerts include phone validation result from ClearoutPhone API.",
    ],
    workflow: "Global — Big Brain — Meetings Tool Sync (action 116) + Sales Big Brain Stage Automation (action 60)",
    emoji: "📅"
  },
  {
    channel: "#Sales-Approval",
    id: "(via Zapier webhook: hooks.zapier.com/hooks/catch/25588006/ucbu0h2/)",
    purpose: "Finance/approval team notification when a deal reaches Pending Approval stage. Fires via Zapier webhook.",
    fires: [
      "Deal moves to Pending Approval → Webhook fires to Zapier → Zapier posts deal info to #Sales-Approval: deal stage, deal owner, deal name, deal link.",
      "Triggered by Stage Automation workflow (action 105) OR Pending Deals Notification workflow (currently disabled — avoid duplicate).",
    ],
    workflow: "Sales — Big Brain — Stage Automation (action 105) + Pending Deals Notification workflow (1778074463, disabled)",
    emoji: "✅"
  },
  {
    channel: "#new-leads",
    id: "C0A8Q4H7X6E",
    purpose: "New lead notifications and delegation alerts. Keeps the team aware of fresh opt-ins.",
    fires: [
      "New opt-in submitted via form → Lead name, email, funnel source, opt-in timestamp.",
      "Lead re-delegated → New owner notified with lead name and re-delegation reason.",
      "Appointments Delegation round-robin fires → New assignment ping.",
    ],
    workflow: "Entry Point Mapping (action 6), Appointments Delegation (action 4)",
    emoji: "🔔"
  },
  {
    channel: "Closed Won Notification",
    id: "(via Zapier webhook: hooks.zapier.com/hooks/catch/18051734/uwi4s3k/)",
    purpose: "Fires when a deal closes won and the associated Setter call was originally 'Scheduled' (tracking setter-to-close attribution).",
    fires: [
      "Deal moves to Closed Won AND associated contact's discovery_call_outcome was = Scheduled → Webhook fires to Zapier for win attribution tracking.",
    ],
    workflow: "Sales — Big Brain — Stage Automation (action 95)",
    emoji: "🏆"
  },
  {
    channel: "Direct Message to Ops Manager",
    id: "U0A0YC606UE",
    purpose: "Emergency fallback. Only fires if the Calendly Error Handler completely fails to find a URI after exhausting all recovery attempts.",
    fires: [
      "Calendly URI cannot be retrieved from Zapier or directly from Calendly API → DM to U0A0YC606UE with contact name, email, and error details for manual resolution.",
    ],
    workflow: "Calendly Booking Error Handler (final action)",
    emoji: "🚨"
  }
];

// ============================================================
// INTEGRATIONS
// ============================================================
WB.integrations = [
  {
    name: "Zapier",
    icon: "⚡",
    status: "Active",
    statusColor: "green",
    description: "Catches the Calendly webhook when a new booking is created (invitee.created event). Searches for the matching HubSpot contact by email, then writes two URI properties back to the Contact record. These URIs are what allows the Big Brain and Calendly Integration workflows to know what was booked.",
    details: [
      "Trigger: Calendly webhook — invitee.created",
      "Action 1: 1-minute delay (allows Calendly data to settle)",
      "Action 2: Search HubSpot contact by email",
      "Action 3: Update contact — writes calendly_scheduled_event_uri",
      "Action 4: Update contact — writes calendly_event_type_uri",
      "Auth ID: a8e87fa0d265...ef8511",
      "Note: Currently paused — Error Handler workflow compensates",
      "Second Zap (ucbu0h2): Receives Pending Approval webhook → posts to #Sales-Approval Slack channel",
      "Third Zap (uwi4s3k): Receives Closed Won attribution webhook → tracks setter-to-close conversion",
    ]
  },
  {
    name: "Calendly",
    icon: "📆",
    status: "Active",
    statusColor: "green",
    description: "The scheduling layer. All meetings are booked via Calendly links. The Big Brain workflow reads Calendly data to determine meeting type, rep assignment, and datetime. The Calendly Integration workflow fetches event type internal_notes for meeting type parsing. The Error Handler calls the Calendly API directly as a fallback.",
    details: [
      "Org ID: EDFFFZ67N5KHDG76",
      "Secret: Calendly_Token (stored in HubSpot Secrets)",
      "4 active scheduling link types: Setter Call, Closer Call, Setter Follow Up, Closer Follow Up",
      "Each link maps to a specific Sales Momentum Pipeline stage and Appointment record type",
      "internal_note field on Event Types stores: 'Meeting Type - Booking Method - notes'",
      "Invitee form question 'Your HubSpot ID' captures which rep set the booking",
    ]
  },
  {
    name: "n8n",
    icon: "🔄",
    status: "Active",
    statusColor: "green",
    description: "Internal automation platform. Receives webhook payloads from HubSpot workflows and handles downstream actions including Google Calendar event deletion (when deals are moved to 'Canceled'), Zoom link management, and ad attribution confirmation.",
    details: [
      "Webhook endpoint: https://n8n.warriorbabe.com/webhook/setter-ads-confirmation",
      "Called by: Global Big Brain workflow (action 116)",
      "Handles: Ad attribution, Google Calendar event deletion on cancel, Zoom link deactivation",
      "CRITICAL: Deleting from Google Calendar directly bypasses n8n and BREAKS automation — always use HubSpot Deal Stage instead",
    ]
  },
  {
    name: "Aloware",
    icon: "📞",
    status: "Active",
    statusColor: "green",
    description: "Dialer and SMS platform used by setters. All outbound calls and SMS are logged through Aloware, which syncs call dispositions to HubSpot. This data feeds the Universal Call Tracker workflow.",
    details: [
      "Syncs outbound call logs to HubSpot Contact activity",
      "Each logged call increments 'sm__number_of_outbound_calls'",
      "Updates 'sm__last_outbound_call_date' on each dial",
      "Disposition types: Connected, No Answer, Voicemail, Busy, Wrong Number",
      "All dispositions trigger the Universal Call Tracker workflow",
    ]
  },
  {
    name: "ClearoutPhone",
    icon: "✅",
    status: "Active",
    statusColor: "green",
    description: "Phone validation API called inside the Big Brain workflow for every new booking. Validates the lead's phone number and returns line type, validity status, and a risk score.",
    details: [
      "Called by: Global Big Brain workflow (action 103)",
      "Secret stored as: clearoutphone",
      "Returns: Line Type (Mobile/Landline/VoIP), Validity (Valid/Invalid), Risk Score",
      "Results included in Slack booking alert so confirmation reps know if number is worth calling",
    ]
  },
  {
    name: "HubSpot Private Apps",
    icon: "🔑",
    status: "Active",
    statusColor: "green",
    description: "Two custom private apps extend HubSpot's capabilities beyond native features.",
    details: [
      "fluffy-time-zone (Fluffy_Timezone): Primary advanced app. Used in Big Brain, Calendly Integration, and Stage Automation custom code nodes. Scopes: CRM meetings read/write, associations read, contacts read/write, owners read.",
      "responsive_pillow: Delegation and availability app. Used for round-robin assignment logic in the Appointments Delegation workflow.",
      "Secrets stored in HubSpot: Fluffy_Timezone, access_token, clearoutphone, Calendly_Token",
      "Both apps are HubSpot Private Apps (not public marketplace apps).",
    ]
  },
];// ============================================================
// HUBSPOT LINKS — appended to WB namespace
// ============================================================

// Workflow IDs already exist on each workflow object.
// The link is: https://app.hubspot.com/workflows/23635629/platform/flow/{id}
WB.hubspotPortalId = "23635629";

WB.getWorkflowUrl = function(id) {
  return `https://app.hubspot.com/workflows/${WB.hubspotPortalId}/platform/flow/${id}`;
};

// ── SMART VIEWS (Contact Object) ──
WB.smartViews = [
  {
    category: "contact",
    categoryLabel: "Contact Object — Smart Views",
    items: [
      { name: "P1: New Hot Leads",                 url: "https://app.hubspot.com/contacts/23635629/objects/0-1/views/57972208/list",  desc: "Fresh opt-ins from today. Lead Status = NEW. Highest priority dialing queue." },
      { name: "P2: Connected & Needs Follow Up",   url: "https://app.hubspot.com/contacts/23635629/objects/0-1/views/57972472/list",  desc: "Meaningful conversation started but no call booked. Lead Status = IN_PROGRESS." },
      { name: "P3: Second Touch for P1",           url: "https://app.hubspot.com/contacts/23635629/objects/0-1/views/57973166/list",  desc: "Older leads showing recent activity signals. Third-priority dialing queue." },
      { name: "P4: Warm Leads",                    url: "https://app.hubspot.com/contacts/23635629/objects/0-1/views/57973180/list",  desc: "Older leads with PROSPECTING or BAD_TIMING status. Lowest setter priority." },
      { name: "No-Shows / Cancels",                url: "https://app.hubspot.com/contacts/23635629/objects/0-1/views/57973212/list",  desc: "Leads whose appointment was missed or canceled. Reactivation queue." },
      { name: "Confirmation Specialist View",      url: "https://app.hubspot.com/contacts/23635629/objects/0-1/views/58348639/list",  desc: "Daily confirmation queue for Confirmation Specialists. Filtered by Confirmation Owner = Me." },
    ]
  },
  {
    category: "deal",
    categoryLabel: "Deal Object — Smart Views",
    items: [
      { name: "Red Zone List",              url: "https://app.hubspot.com/contacts/23635629/objects/0-3/views/58180191/list",  desc: "All deals in Red Zone stage, sorted by Expected Close Date. Priority 1 for Closers." },
      { name: "Closer Nurture List",        url: "https://app.hubspot.com/contacts/23635629/objects/0-3/views/58180210/list",  desc: "All Nurture deals sorted by Next Touch Date. Blank date = treat as Lost." },
      { name: "My Upcoming Appointments",   url: "https://app.hubspot.com/contacts/23635629/objects/0-3/views/58180217/list",  desc: "Deal-level view of upcoming appointments assigned to you." },
      { name: "My At-Risk Deals",           url: "https://app.hubspot.com/contacts/23635629/objects/0-3/views/58180362/list",  desc: "Deals flagged as at-risk — expected close date approaching with no movement." },
    ]
  }
];

// ── DASHBOARDS ──
WB.dashboards = [
  { name: "Show Rate Engine Dashboard — General", url: "https://app.hubspot.com/reports-dashboard/23635629/view/18694861",  desc: "Overall show rate, confirmation rates, and appointment outcomes across all call types." },
  { name: "Setter Engine Dashboard",              url: "https://app.hubspot.com/reports-dashboard/23635629/view/18588940",  desc: "Speed to Lead, dial volume, lead status distribution, and setter KPIs." },
  { name: "Closer Engine Dashboard — Main",       url: "https://app.hubspot.com/reports-dashboard/23635629/view/18647844",  desc: "Deal pipeline health, close rates, Red Zone forecasting, and Closer performance." },
  { name: "Speed To Lead Tracking",               url: "https://app.hubspot.com/reports-dashboard/23635629/view/18566973",  desc: "Detailed STL breakdown by bucket, rep, and time period." },
];

// ── LEAD SCORING ──
WB.leadScoring = [
  { name: "Setter Engine Lead Score", url: "https://app.hubspot.com/lead-scoring/23635629/details/514456305435", desc: "Composite lead score driving P1–P4 Smart View priority sorting. Higher score = dial first." },
];

// ── SEGMENTS / LISTS ──
WB.segments = [
  {
    group: "Show Rate / Appointment Lists",
    items: [
      { name: "Sales - Upcoming Appts",                    id: "2379", url: "https://app.hubspot.com/contacts/23635629/objectLists/2379/filters",  desc: "All contacts with an upcoming appointment (>48 hrs). Base list for confirmation flow." },
      { name: "Sales - Upcoming Unconfirmed Appts - 48h",  id: "2381", url: "https://app.hubspot.com/contacts/23635629/objectLists/2381/filters",  desc: "Appointment 24–48 hours out, not yet confirmed. Triggers stronger nudge messaging." },
      { name: "Sales - Upcoming Confirmed Appts",          id: "2382", url: "https://app.hubspot.com/contacts/23635629/objectLists/2382/filters",  desc: "Contacts who confirmed their appointment. Triggers thanks + prep sequence." },
      { name: "Sales - Upcoming Unconfirmed Appts - 24h",  id: "2380", url: "https://app.hubspot.com/contacts/23635629/objectLists/2380/filters",  desc: "Appointment under 24 hours, not confirmed. Highest urgency confirmation outreach." },
      { name: "Show Rate Engine - Never Confirmed",        id: "2392", url: "https://app.hubspot.com/contacts/23635629/objectLists/2392/filters",  desc: "Appointment time passed with no confirmation recorded. Feeds Never Confirmed pipeline stage." },
    ]
  },
  {
    group: "Setter Engine Lists",
    items: [
      { name: "Setter Engine - Leads to Be Set",                         id: "2212", url: "https://app.hubspot.com/contacts/23635629/objectLists/2212/filters",  desc: "Active list of leads currently in the Lead Refresh cooldown (lead_refresh_active = Yes)." },
      { name: "Bad Data",                                                 id: "2179", url: "https://app.hubspot.com/contacts/23635629/objectLists/2179/filters",  desc: "Contacts with invalid phone numbers or bad email data. Removed from dialing queue." },
      { name: "Active - Quiz Leads (Warm - No App)",                     id: "2182", url: "https://app.hubspot.com/contacts/23635629/objectLists/2182/filters",  desc: "Quiz funnel leads who are warm but have not submitted an application yet." },
      { name: "Active - VSL Leads (Warm - No App)",                      id: "2181", url: "https://app.hubspot.com/contacts/23635629/objectLists/2181/filters",  desc: "VSL funnel leads who are warm but have not submitted an application yet." },
      { name: "Active - High Intent (App + No Call)",                    id: "2180", url: "https://app.hubspot.com/contacts/23635629/objectLists/2180/filters",  desc: "Leads who submitted an application but have not been called yet. Priority dial segment." },
      { name: "Setter Engine - Setter Nurture List from Deal Pipeline",   id: "2319", url: "https://app.hubspot.com/contacts/23635629/objectLists/2319/filters",  desc: "Contacts tied to deals in Setter Nurture stage. Setter follow-up queue." },
    ]
  },
  {
    group: "Closer Engine Lists",
    items: [
      { name: "Closer Engine - Contacts with Deal in Nurture Stage", id: "2371", url: "https://app.hubspot.com/contacts/23635629/objectLists/2371/filters",  desc: "Contacts whose deal is in Closing Qualified/Nurture stage. Enrolled in Closer Nurture email workflow." },
    ]
  },
  {
    group: "Master Static Lists",
    items: [
      { name: "Master Static - Quiz",               id: "2174", url: "https://app.hubspot.com/contacts/23635629/objectLists/2174/filters",  desc: "All-time master list of Quiz funnel opt-ins." },
      { name: "Master Static - VSL",                id: "2173", url: "https://app.hubspot.com/contacts/23635629/objectLists/2173/filters",  desc: "All-time master list of VSL funnel opt-ins." },
      { name: "Master Static - Low Ticket (PQL)",   id: "2170", url: "https://app.hubspot.com/contacts/23635629/objectLists/2170/filters",  desc: "All-time list of Low-Ticket purchasers. Product Qualified Leads — highest intent segment." },
      { name: "ALL LEADS | Master Static List",     id: "2079", url: "https://app.hubspot.com/contacts/23635629/objectLists/2079/filters",  desc: "The full universe — every lead who has ever opted in across all funnels." },
    ]
  }
];