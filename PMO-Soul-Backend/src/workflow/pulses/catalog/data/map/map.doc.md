# Map Fields (`data.map`)

Builds several variables at once from `{{templates}}` — copy, rename, combine — with no code.

| Target | Value |
|---|---|
| `customerName` | `{{record.customer.fullName}}` |
| `amount` | `{{record.amount}}` (a lone template keeps its type: a number stays a number) |
| `summary` | `Loan {{record.reference}} for {{record.amount}}` (text around it makes a string) |

- **Into (optional):** collect them into one object, e.g. `payload`, for a Create Record / HTTP step.
- Arithmetic or rules are for **Run JavaScript**.
- **Errors:** MissingFields, InvalidFieldName.
