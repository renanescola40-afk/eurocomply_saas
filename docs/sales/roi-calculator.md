# RISCK COMPLY — Simple ROI Calculator

This is a lightweight calculator for discovery calls. Use it to quantify manual compliance cost and show a practical business case.

## Inputs

| Input | Description | Example |
| --- | --- | --- |
| A | Hours per month spent updating compliance spreadsheets | 20 |
| B | Hours per month spent chasing owners and vendors | 15 |
| C | Hours per month spent preparing audit/customer evidence | 10 |
| D | Blended hourly cost of the people involved | €60 |
| E | Avoided external admin/consulting cost per month | €500 |
| F | Estimated value of faster customer/procurement reviews | €750 |
| G | Monthly RISCK COMPLY subscription | €399 |

## Formula

```text
Monthly value = ((A + B + C) × D) + E + F - G
Annual value = Monthly value × 12
Payback ratio = Monthly gross value / subscription cost
```

Where:

```text
Monthly gross value = ((A + B + C) × D) + E + F
```

## Example

```text
A = 20 spreadsheet hours
B = 15 chasing hours
C = 10 evidence hours
D = €60/hour
E = €500 avoided admin cost
F = €750 faster review value
G = €399 subscription

Monthly gross value = ((20 + 15 + 10) × 60) + 500 + 750
Monthly gross value = €3,950
Monthly value after subscription = €3,551
Annual value = €42,612
Payback ratio = 9.9x
```

## Conservative version

If the buyer is skeptical, remove `F` from the calculation and only show operational time saved.

```text
Conservative monthly value = ((A + B + C) × D) + E - G
```

## Discovery questions for ROI

- How many people touch compliance tracking today?
- How many hours per month go into spreadsheet updates?
- How often do customer or audit questions require manual evidence collection?
- How many vendors need recurring review?
- What is the cost of delaying a customer security/procurement review?
- Which team is most overloaded: finance, compliance, DPO, legal, IT/security or procurement?

## Sales note

Do not overstate ROI. Use the buyer’s own numbers, show conservative and realistic scenarios, and position the calculator as an estimate rather than a guarantee.
