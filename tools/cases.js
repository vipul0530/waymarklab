/* =========================================================
   The eight case studies.

   This file is the source for the eight work-<slug>.html pages and
   for the galleries on index.html and work.html. Run
   `node tools/build-cases.js` after editing it.

   Every company named here is invented. Nothing on the public site
   describes a client relationship, and none of these were delivered
   work. They are concepts built from common back office processes.
   ========================================================= */

module.exports = [
{
  slug:"receivables",
  mockup:"mockups/receivables.html",
  role:"Accounts receivable specialist",
  company:"Vantera Mechanical Group",
  tool:"Receivables",
  sector:"Commercial mechanical contractor",
  where:"Ontario, California",
  stat:"87%",
  statcap:"of everything past due was held by the contractor's own paperwork, not by customers refusing to pay",
  headline:"The aged receivable is mostly our own paperwork",
  cardThesis:"Most of what sits past ninety days is not a customer refusing to pay. It is a document nobody inside the building has produced yet.",
  thesis:"Most aged receivable is blocked on the contractor's own paperwork, not on customers refusing to pay. Sort the queue by who owes the next move and the collections problem turns into a document problem.",
  posting:"The role is collections on roughly three hundred open invoices, reconciling cash receipts, chasing pay applications through customer portals, and producing a weekly aging report for the controller. It runs across the accounting system, the project management system and a spreadsheet.",
  manual:"That job is a person with two screens and a phone. They read the aging report, decide which of sixteen past due invoices to work today, open the job folder to find out why each one is stuck, write the same email for the fourth time, and record what they did in a spreadsheet the controller reads on Monday. The part that never gets done is the part that matters most: separating the invoices a customer is holding from the invoices held by a missing certified payroll, an unsigned change order, or a receipt that landed in the bank and was never applied.",
  screens:[
    { img:"receivables-01-stuck", name:"What is stuck",
      cap:"The queue is grouped by who owes the next move, not by age. Six invoices worth $226,845 are waiting on somebody inside the building. Two, worth $63,580, are genuinely with the customer. That split is the whole argument, and it is made by the structure of the screen rather than by a sentence at the top." },
    { img:"receivables-02-chase", name:"Chase it",
      cap:"One invoice, opened. What is holding it, who has to act, what has already been tried, and a follow up drafted from the pay application, the portal status and four email threads. The channel is chosen from how that person actually responds, because a superintendent who answers texts within the hour and email in three days is a fact worth encoding." },
    { img:"receivables-03-moved", name:"It moved",
      cap:"The outcome screen shows a changed system state rather than a receipt. Blocked money before, blocked money after, and the pattern behind the delay: the fourth invoice this year held for the same missing document, each one sitting an average of thirty one days before anyone noticed." }
  ],
  details:[
    { img:"receivables-detail-split", cap:"The one figure that reframes the job. Two numbers, one border, no chart." },
    { img:"receivables-detail-aging", cap:"Past due by age, as a single rule rather than a bar chart with a legend." },
    { img:"receivables-detail-drafted", cap:"The follow up, assembled from the record, with the channel and the reasoning shown." }
  ],
  build:[
    { h:"What it reads",
      p:"The accounting system for invoices, receipts and aging. The project management system for pay applications, change orders and job folders. Email threads for what has already been said. Nothing here needs a new source of truth, it needs the four existing ones read together." },
    { h:"What it writes",
      p:"A logged contact against the invoice, an assignment to the person who owes the next move, and a rule that fires before the next invoice goes out. Everything else stays where the controller already looks for it." },
    { h:"What is genuinely hard",
      p:"Classifying the blocker. Deciding that an invoice is held by a missing document rather than by a slow customer takes both systems and the email thread, and it is the difference between a report and a working screen. Expect to spend most of the build here." },
    { h:"Shape of the work",
      p:"Four to six weeks. One designer and one engineer working directly with the person who runs the aging report. Roughly $12,000 to $18,000 depending on how many systems have to be read." }
  ]
},
{
  slug:"claims",
  mockup:"mockups/claims.html",
  role:"Claims and settlement coordinator",
  company:"Ashcroft Final Mile",
  tool:"Settlement",
  sector:"Final mile delivery",
  where:"Anaheim Hills, California",
  stat:"$14,280",
  statcap:"approved for deduction and not yet attached, with five days left before the settlement run closes",
  headline:"A claim that misses the settlement cutoff is gone",
  cardThesis:"Damage claims are worth money only until the carrier settlement run closes. After that the loss is permanent and nobody sends a reminder.",
  thesis:"A claim that misses the carrier settlement cutoff becomes a permanent loss. Everything in the screen is built around one deadline that nothing in the current process makes visible.",
  posting:"The role is opening damage claims from driver reports and delivery photos, collecting statements from customers and carrier partners, setting reserves, and attaching approved deductions to weekly carrier settlements. The response window in the carrier agreements gets treated as a detail, and it is the whole job.",
  manual:"The work is a queue of claims in a spreadsheet, a folder of photographs on a phone, and a settlement run every Friday at five. The coordinator knows which claims are ready and which are still waiting on a partner, because they have been holding it in their head all week. What the spreadsheet cannot show is time. A claim approved on Thursday and attached on Monday is worth nothing, and nothing in the process says so out loud.",
  screens:[
    { img:"claims-01-cycle", name:"Closing this cycle",
      cap:"The cutoff is the screen. A live count to the next settlement run sits next to the money that is approved and not yet attached, and the queue is sorted by time to each partner's own run rather than by claim value. The countdown is derived from the clock, so this screen is never out of date." },
    { img:"claims-02-attach", name:"Attach to settlement",
      cap:"The delivery photographs are read into a drafted description and a suggested reserve, with the basis for the number shown. The coordinator confirms or edits. Beside it, a gap check that names what is missing and what that costs: partners disputed six of the last eight chargebacks that went out without a customer statement." },
    { img:"claims-03-statement", name:"Partner statement",
      cap:"The statement the partner receives, with every chargeback line linked back to the claim it came from and the evidence attached to it. The line added a moment ago is marked, so the person sending it can see exactly what changed since they last looked." }
  ],
  details:[
    { img:"claims-detail-countdown", cap:"The live cutoff. Money at risk on the left, time remaining on the right." },
    { img:"claims-detail-pattern", cap:"A pattern surfaced inside the queue, at the row it concerns, not in a report." },
    { img:"claims-detail-photoread", cap:"Photographs read into a draft the coordinator confirms, with the reasoning visible." }
  ],
  build:[
    { h:"What it reads",
      p:"Driver reports and delivery photographs, proof of delivery, the carrier agreements for cutoff days and response windows, and the settlement run that already exists in the accounting system." },
    { h:"What it writes",
      p:"A chargeback line on the next settlement, linked to the claim, and a claim record complete enough that a partner dispute can be answered from one screen." },
    { h:"What is genuinely hard",
      p:"Reading a damage photograph well enough to draft a reserve a person will accept. This works because the suggestion is always shown with its basis and can be overridden in one click, not because the read is always right." },
    { h:"Shape of the work",
      p:"Five to seven weeks. Roughly $14,000 to $20,000. The countdown and the settlement attachment are the first two weeks. The photograph read is the rest." }
  ]
},
{
  slug:"credentialing",
  mockup:"mockups/credentialing.html",
  role:"Provider credentialing coordinator",
  company:"Cortland Medical Group",
  tool:"Provider File",
  sector:"Multi site medical group",
  where:"Riverside, California",
  stat:"38 claims",
  statcap:"denied in one quarter for a provider whose license renewed on time and whose plan never got the new date",
  headline:"A lapsed credential stops the billing silently",
  cardThesis:"Nothing announces a lapsed credential. The claim denies six weeks after the visit, and by then there are six weeks of visits behind it.",
  thesis:"A lapsed credential silently stops a provider from billing, and nobody notices until the claim denies. The only useful view is the one that puts every expiring item on a horizon and attaches a dollar figure to each one.",
  posting:"The role is tracking licenses, registrations, malpractice coverage and board certifications across four sites, assembling packets for commercial plan enrollment and recredentialing, and following up with plans on submission status. It is detail oriented and deadline driven, and a single missed date is expensive.",
  manual:"This is a spreadsheet with a tab per plan and a shared drive with a folder per provider. The coordinator watches expiration dates, chases physicians for signatures, assembles a packet, sends it into a plan portal, and then waits thirty to sixty days with no way to see where anything stands. When a claim denies, tracing it back to the date on a form takes an afternoon.",
  screens:[
    { img:"credentialing-01-expiring", name:"Expiring credentials",
      cap:"Every provider plotted on a hundred and twenty day horizon by the item that expires first, with monthly billing attached to each one. One provider is already past expiration and still on the schedule. The screen puts a dollar figure on a date, which is the thing the spreadsheet could never do." },
    { img:"credentialing-02-packet", name:"Packet assembly",
      cap:"The uploaded license image is read into fields, each with a confidence figure, and the one read through a fold in the scan is flagged for a human before anything downstream keys off it. Beside it, the packet checklist and a gap check that names exactly which two items will bounce and why." },
    { img:"credentialing-03-payers", name:"Payer status",
      cap:"Every provider against every plan, in one grid. Par, in review with a day count, not started, or a date the plan gave us for when billing stops. Four provider and plan pairs have no packet at all, and the providers in them are seeing patients this week." }
  ],
  details:[
    { img:"credentialing-detail-horizon", cap:"The horizon. Time runs left to right and the pip is the date the item expires." },
    { img:"credentialing-detail-licenseread", cap:"Extracted fields with confidence, and the weak read marked for a person." },
    { img:"credentialing-detail-impact", cap:"Three figures that make the case for doing this at all." }
  ],
  build:[
    { h:"What it reads",
      p:"The credential records that already exist in a spreadsheet, uploaded certificate images, the plan roster responses, and the claim denials that can be traced back to a participation date." },
    { h:"What it writes",
      p:"A provider record with dated, sourced fields, a packet ready to submit, and a status per provider and plan pair that somebody other than the coordinator can read." },
    { h:"What is genuinely hard",
      p:"Every plan wants a different packet and answers on a different clock. The grid is easy. Encoding what each plan actually requires, and what each one rejects packets for, is the work." },
    { h:"Shape of the work",
      p:"Six to eight weeks. Roughly $15,000 to $20,000. The horizon and the grid can be useful in two weeks. The document read and the per plan rules take the rest." }
  ]
},
{
  slug:"draw-control",
  mockup:"mockups/draw-control.html",
  role:"Contract and compliance administrator",
  company:"Bellhaven Construction Group",
  tool:"Draw Control",
  sector:"General contractor",
  where:"Irvine, California",
  stat:"$1,284,900",
  statcap:"the entire draw, held by two subcontractor certificates that expired quietly mid month",
  headline:"One expired certificate holds the entire draw",
  cardThesis:"The lender reviews the draw package as one document. A single subcontractor certificate that expired mid month holds all nine trades.",
  thesis:"An expired subcontractor certificate of insurance holds up an entire draw. Nobody decides to hold it. It is held because a file on a shared drive quietly reached its expiration date.",
  posting:"The role is collecting and tracking certificates of insurance and lien releases across active jobs, verifying coverage against subcontract requirements, assembling monthly draw packages for the lender, and keeping a compliance log. It runs on attention to detail and comfort with deadlines.",
  manual:"A folder of certificates, a spreadsheet of expiration dates that is updated when someone remembers, and a monthly scramble to assemble a draw package before the owner meeting. Verifying a certificate means opening the subcontract, finding the required limits, and comparing them by eye. Most of the time it is fine. The month it is not fine, nine subcontractors do not get paid.",
  screens:[
    { img:"draw-control-01-wall", name:"Coverage wall",
      cap:"Every subcontractor on the job against every coverage they owe, with the expiration printed on the certificate rather than the date somebody typed into a spreadsheet. Two trades are working today on coverage that expired earlier this month, which is visible here in about two seconds." },
    { img:"draw-control-02-waivers", name:"Waivers on this draw",
      cap:"The pay application, the releases in hand, the second tier releases the lender also wants, and a certificate read that compares the limits on the document to the limits in the subcontract. Three shortfalls and an expired policy on one certificate that looks current at a glance." },
    { img:"draw-control-03-readiness", name:"Release readiness",
      cap:"Five gates between the work and the money, each one either open or named. Two of the three blocking items are a phone call to a broker and the third is a signature. None of them is a dispute about money, which is the point of showing them this way." }
  ],
  details:[
    { img:"draw-control-detail-held", cap:"The whole draw, held, next to the number of days until the meeting." },
    { img:"draw-control-detail-certread", cap:"Required limits against the limits on the certificate, with shortfalls marked." },
    { img:"draw-control-detail-gates", cap:"Gates, not a checklist. Each one says what is missing and what it is worth." }
  ],
  build:[
    { h:"What it reads",
      p:"Certificates of insurance as they arrive, the subcontract requirements per trade, pay applications, and the release forms coming back from subcontractors and their own suppliers." },
    { h:"What it writes",
      p:"A compliance record per subcontractor per job, a request to the broker on record when a certificate falls short, and a draw package that is either complete or specific about what is missing." },
    { h:"What is genuinely hard",
      p:"Certificates are photographs of forms. Reading limits and endorsements out of them reliably, and knowing that a referenced endorsement is not an attached endorsement, is most of the build." },
    { h:"Shape of the work",
      p:"Five to seven weeks. Roughly $14,000 to $19,000. The wall and the readiness gates come first because they are useful before any document read is working." }
  ]
},
{
  slug:"order-desk",
  mockup:"mockups/order-desk.html",
  role:"Order entry and inventory clerk",
  company:"Halstead Supply Co.",
  tool:"Order Desk",
  sector:"Wholesale distributor",
  where:"Fontana, California",
  stat:"$99,850",
  statcap:"of orders stopped in the aisle by stock the system said was on the shelf",
  headline:"The margin leaks where the shelf and the system disagree",
  cardThesis:"Six orders stopped this morning. Not one of them stopped because a customer changed something.",
  thesis:"The variance between what the system says is on the shelf and what is actually there is where the margin leaks. A count history is already in the system. Nothing connects it to the allocation that promised the stock.",
  posting:"The role is entering orders, allocating stock, running cycle counts, reconciling variances, and placing replenishment purchase orders with a handful of vendors. It lives inside the enterprise system and it is judged on speed and accuracy at the counter.",
  manual:"An order comes in, the clerk allocates against the quantity on hand, and a picker discovers the truth in the aisle. The variance gets written off as a miscount because four boxes is not worth an investigation. Nine counts later the same bin is still short, the same customer is still standing at the will call counter, and the purchase order that would have fixed it was calculated from the number that was wrong.",
  screens:[
    { img:"order-desk-01-blocked", name:"Orders that will not ship",
      cap:"Six orders, each stopped by exactly one line, with the blocking item opened inline. System quantity, shelf quantity, the shortage and the age of the last count, on the same row as the customer who is waiting. The clerk does not have to go looking for the reason." },
    { img:"order-desk-02-variance", name:"Count variances",
      cap:"Nine counts per bin as a small bar, so the shape of the problem is visible without a report. One bin has been short on six of nine counts, always in the week after a container arrives, which is a put away step nobody records rather than shrink." },
    { img:"order-desk-03-reorder", name:"Purchase reorder",
      cap:"A drafted purchase order built from the vendor's real lead time and the variance each bin actually runs, with a confidence on every line and a keep or drop control. One line is held back because sixty units may already be in the building, which is a judgment the buyer confirms rather than one the system makes." }
  ],
  details:[
    { img:"order-desk-detail-blocked", cap:"The blocking line, opened where the order is, with four numbers that explain it." },
    { img:"order-desk-detail-pattern", cap:"Nine counts and the pattern behind them, stated in plain language." },
    { img:"order-desk-detail-worksheet", cap:"Suggested quantities with confidence, and a line held back for a human to check." }
  ],
  build:[
    { h:"What it reads",
      p:"Open orders and allocations, the cycle count history that is already being recorded, receiving records, and the vendor lead times that can be measured from purchase order history instead of trusted from the item master." },
    { h:"What it writes",
      p:"A flag on an allocation that is unlikely to pick clean, a count task for a bin that is drifting, and a purchase order draft the buyer edits before it goes." },
    { h:"What is genuinely hard",
      p:"Nothing about the data. The hard part is being right often enough that the buyer stops checking every line, and being obviously wrong in a way they can correct in one click when the model is off." },
    { h:"Shape of the work",
      p:"Four to six weeks. Roughly $10,000 to $16,000. The variance history is usually sitting in the existing system already, which makes the first useful screen fast." }
  ]
},
{
  slug:"dispatch",
  mockup:"mockups/dispatch.html",
  role:"Service dispatcher",
  company:"Torrey Mechanical Services",
  tool:"The Board",
  sector:"Mechanical service company",
  where:"Corona, California",
  stat:"44.3 / 48",
  statcap:"hours already committed before four unassigned calls go anywhere, and the dispatcher is out until the 8th",
  headline:"The schedule breaks the week the dispatcher takes vacation",
  cardThesis:"Which technician is certified on which chiller, which visit can move, which customer will accept whom. None of it is written down.",
  thesis:"A dispatcher holds the whole schedule in their head, and the schedule breaks the day they take vacation. The board is correct. The knowledge that produced it is not recorded anywhere.",
  posting:"The role is scheduling and dispatching six technicians, handling emergency calls under contract response windows, coordinating parts, and keeping preventive maintenance visits on their agreement dates. It usually calls for three years in the trade, which is a way of asking for the knowledge nobody wrote down.",
  manual:"A whiteboard, a phone, and one person who knows that the customer in Corona will not accept the second year technician, that the Ridgeline chiller needs one of the two certified people, and that the Halcyon visit has already been moved twice. When that person is out, the board still exists and the knowledge does not, so the calls get assigned by whoever is free instead of by who should go.",
  screens:[
    { img:"dispatch-01-today", name:"Today's board",
      cap:"Six technicians against a day, with a live marker for the current time, four calls with nobody on them, and the committed hours already at forty four of forty eight. Emergency work on a contract account is marked, and so is the job that is running past its estimate and pushing everything behind it." },
    { img:"dispatch-02-unassigned", name:"Unassigned and at risk",
      cap:"Each unassigned call gets a suggested technician and the reasons behind it: the certification, the eleven minute drive from the previous stop, the contract clock that started at nine forty, and what moving the alternative would cost. The dispatcher accepts it or picks somebody else, and either way the reasoning is now on the record." },
    { img:"dispatch-03-tomorrow", name:"Tomorrow's load",
      cap:"Committed hours against available hours per technician, and the contract maintenance visits that will slip if nothing changes, with the agreement date next to each one. Three technicians are over eight hours and two are under, which is a knowledge problem rather than a scheduling problem." }
  ],
  details:[
    { img:"dispatch-detail-board", cap:"The board. Time across, technicians down, a marker for now." },
    { img:"dispatch-detail-suggestion", cap:"A suggestion with its reasons and its cost, accepted or overridden inline." },
    { img:"dispatch-detail-capacity", cap:"Tomorrow, in committed hours against available hours, per truck." }
  ],
  build:[
    { h:"What it reads",
      p:"The service system for calls, technicians and history, the maintenance agreements for response windows and visit dates, and the certifications that usually live in a binder or in one person's memory." },
    { h:"What it writes",
      p:"An assignment with the reasoning attached, a maintenance visit that is either scheduled or explicitly at risk, and a record of which technician has been to which building." },
    { h:"What is genuinely hard",
      p:"Getting the knowledge out of the dispatcher's head without asking them to fill in a form. Most of it can be inferred from the history of who went where and what came back, and the rest is worth an interview." },
    { h:"Shape of the work",
      p:"Five to seven weeks. Roughly $13,000 to $19,000. The board alone is worth building first, because a schedule someone else can read is most of the value." }
  ]
},
{
  slug:"quality-log",
  mockup:"mockups/quality-log.html",
  role:"Quality coordinator",
  company:"Ferrand Precision Works",
  tool:"Quality Log",
  sector:"Contract manufacturer",
  where:"Santa Ana, California",
  stat:"20 seconds",
  statcap:"to produce a finding with its evidence for a registrar, against roughly two days of assembling folders",
  headline:"The findings live where an auditor cannot see them",
  cardThesis:"Three findings are in a spreadsheet, two in an email thread, and one in a folder on a desk. A registrar will ask for any of them at random.",
  thesis:"Quality findings live in a spreadsheet nobody can produce during an audit. The record has to be the working tool, not a document assembled afterward from memory.",
  posting:"The role is opening and closing nonconformance reports, running containment, leading root cause and corrective action, maintaining the quality record for a certification standard, and supporting customer and registrar audits. The standard and the customer response windows set the pace.",
  manual:"A nonconformance is opened in a spreadsheet, containment happens on the floor and gets described in an email, root cause is a conversation, and the corrective action is a paragraph written the week before the audit. Every part of that is real work done by capable people. None of it produces a record where the evidence is attached to the step it supports, which is the only form an auditor accepts.",
  screens:[
    { img:"quality-log-01-open", name:"Open findings",
      cap:"Five open nonconformances with a five stage rail showing where each one actually is, and the customer response window next to it. Three are past the window written into the customer's own supplier agreement, which is itself a finding waiting to happen." },
    { img:"quality-log-02-cause", name:"Containment and cause",
      cap:"Containment as a location table, so all four hundred and eighty pieces are accounted for including the sixty two at the customer and the hundred on a truck. The cause chain carries the evidence at each step, and the step with no evidence is marked. Beside it, a customer notice drafted from the containment record itself." },
    { img:"quality-log-03-trail", name:"Audit trail",
      cap:"The append only record, and an audit readiness check that says what a registrar will ask for and is not here. Twenty seconds to produce a finding with its evidence, against roughly two days of assembling folders, email and one spreadsheet." }
  ],
  details:[
    { img:"quality-log-detail-stages", cap:"Five stages as a rail on every row. Where it is, not what colour it is." },
    { img:"quality-log-detail-fivewhy", cap:"A cause chain where each step carries the document behind it, or says it has none." },
    { img:"quality-log-detail-readiness", cap:"What the registrar will ask for, and which of it is missing." }
  ],
  build:[
    { h:"What it reads",
      p:"The existing nonconformance spreadsheet, shipping and receiving records for where suspect material went, the gauge and calibration log, and the customer supplier agreements for response windows." },
    { h:"What it writes",
      p:"An append only record with evidence attached per step, a customer notice with the version that was sent, and a cause code that makes repeat findings visible instead of invisible." },
    { h:"What is genuinely hard",
      p:"Making the record faster to use than the spreadsheet it replaces. If entering a containment location takes longer than typing it into a cell, the record is empty within a month and the audit is worse than before." },
    { h:"Shape of the work",
      p:"Five to seven weeks. Roughly $12,000 to $18,000. Containment and the trail first. The cause chain and the readiness check follow once people are actually working in it." }
  ]
},
{
  slug:"spend-desk",
  mockup:"mockups/spend-desk.html",
  role:"Purchasing and accounts payable coordinator",
  company:"Whitlock Barrow",
  tool:"Spend Desk",
  sector:"Professional services firm",
  where:"Pasadena, California",
  stat:"$93,000",
  statcap:"renews automatically inside ninety days across seven agreements, four of which have no owner",
  headline:"Renewals charge because nobody owns the calendar",
  cardThesis:"Nobody approves an auto renewal. It happens, and it shows up as a variance nine months later.",
  thesis:"Renewals auto charge because no one owns the calendar. Approvals are the easy half of this job. The expensive half is the agreements that renew whether or not anybody makes a decision.",
  posting:"The role is processing purchase requests and vendor invoices, enforcing the approval policy, maintaining the vendor list, tracking contract renewals, and supporting the budget process. Renewals are one line in a list of eight.",
  manual:"Requests arrive by email and get approved by whoever is available. Vendor agreements sit in a shared drive, each with its own notice window buried in section nine. Nobody is against reviewing them. It is simply that the only person who would notice a renewal is the person who happens to open the invoice, and by then the notice window closed eleven days ago.",
  screens:[
    { img:"spend-desk-01-approvals", name:"Pending approvals",
      cap:"Five requests, each checked against the approval policy before it reaches a person, with the checks shown rather than described. On the largest one, an overlap: the firm already pays another vendor thirty one thousand a year for the same reporting, and eleven people are licensed on both." },
    { img:"spend-desk-02-budget", name:"Spend against budget",
      cap:"Spent, committed, and the budget marker on one bar per group. The forecast is not a projection of behaviour, it is the sum of contracts that will charge whether or not anyone acts, which is why three groups are already over with four months left." },
    { img:"spend-desk-03-renewals", name:"Vendor renewals",
      cap:"Every agreement plotted on the month it renews, with the notice window drawn as the lead in, because that window is the only time cancelling is possible. Ninety three thousand renews automatically inside ninety days and four of those agreements have no owner at all." }
  ],
  details:[
    { img:"spend-desk-detail-overlap", cap:"An overlap surfaced before the approval, not after the invoice." },
    { img:"spend-desk-detail-budget", cap:"Spent, committed, and the budget marker, on one bar per group." },
    { img:"spend-desk-detail-calendar", cap:"Twelve months of renewals, with the notice window as the dashed lead in." }
  ],
  build:[
    { h:"What it reads",
      p:"Purchase requests and vendor invoices from the accounting system, the vendor agreements themselves for renewal dates and notice windows, and the seat or usage reports that say whether a subscription is being used." },
    { h:"What it writes",
      p:"An approval with the policy checks recorded, an owner against every agreement, and a calendar entry inside the notice window rather than on the renewal date." },
    { h:"What is genuinely hard",
      p:"Getting the renewal terms out of the agreements. This is the piece everyone hopes is automatic. It is mostly automatic and needs a person for the rest, and the screen should be honest about which is which." },
    { h:"Shape of the work",
      p:"Four to six weeks. Roughly $9,000 to $15,000. The renewal calendar is often worth more than the approval queue and takes less time to build." }
  ]
}
];
