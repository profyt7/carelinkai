# Provider taxonomy

"Providers" are businesses that serve seniors at home or in care (not care homes, not individual caregivers).
Source of truth in code: `src/lib/providers/categories.ts`. Stored on `Provider.serviceTypes` (a list, so a provider can pick several).

## Launch categories (selectable at signup and on the profile, searchable on /marketplace/providers)

| Value | Label | Kind | Covers |
|---|---|---|---|
| `home-health` | Home Health Care | **Skilled, licensed** | Nursing, wound care, medication management at home |
| `personal-care` | Personal Care & Home Assistance | **Non-medical** | Bathing, dressing, companionship, homemaking, respite |
| `therapy` | Physical & Rehabilitation Therapy | **Skilled, licensed** | Physical, occupational and speech therapy |
| `transportation` | Medical Transportation | Service | NEMT, wheelchair transport, rides to appointments |
| `meal-delivery` | Meal Delivery & Nutrition | Service | Prepared meals delivered, special diets, nutrition support |
| `medical-equipment` | Medical Equipment & Supplies | Service | Mobility aids, hospital beds, oxygen, supplies |

Skilled and non-medical are always labelled apart, for example "Home Health Care (skilled, licensed)" and "Personal Care & Home Assistance (non-medical)". A family must never read companionship or homemaking as nursing.

There is no verification system for categories. A provider's choice is self-reported. The Verified badge comes only from reviewed credentials, and Boost never affects it.

## Legacy values (existing rows are not rewritten)

| Stored value | Counts as |
|---|---|
| `transportation` | Medical Transportation |
| `personal-care` | Personal Care & Home Assistance |
| `companionship`, `housekeeping`, `meal-prep`, `respite-care` | Personal Care & Home Assistance (non-medical, in-home) |
| `medical-services` | No launch category: it's ambiguous whether this is skilled care. The profile shows "Medical services (unspecified)" until the provider re-picks. |
| `home-modification` | No launch category (a future Home Safety & Accessibility category). The profile shows "Home modification". |

## Optional profile fields

- **Service area:** cities, states and ZIP codes (`coverageArea`).
- **Delivery mode:** in-home, at a facility, remote (`deliveryModes`).
- **License or certification number:** free text, self-reported (`licenseNumber`). Admin-only: it isn't in the public API and isn't shown on the public profile.

## Future categories (docs only: not selectable or searchable yet)

- Hospice & Palliative
- Pharmacy & Medication
- Home Safety & Accessibility
- Adult Day & Respite
- Mental Health & Counseling
- Care Management & Placement
- Legal & Financial
- Moving & Downsizing

Adding one means:
1. a new entry in `PROVIDER_CATEGORIES`;
2. any legacy aliases;
3. an update to the homepage summary and this file.

No migration is needed: `serviceTypes` is a free list.
