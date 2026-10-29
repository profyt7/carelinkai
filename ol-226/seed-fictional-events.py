# Fictional OL-226 funnel events for the admin screenshots (local DB only).
import json, random, uuid, datetime
random.seed(226)
now = datetime.datetime.utcnow()
rows = []
def ev(name, sid, props, listing=None, days_ago=None):
    ts = now - datetime.timedelta(days=days_ago if days_ago is not None else random.uniform(0, 6.5))
    rows.append((str(uuid.uuid4()).replace('-', '')[:25], name, listing, sid, json.dumps(props), ts.isoformat()))
listings = [f"cmfixture{n:02d}home{n*7:03d}x" for n in range(1, 25)]
facts = {l: dict(availability_state=random.choice(['verified', 'unverified', 'unverified']), has_photo=random.random() < .55, has_price=random.random() < .4, claimed=random.random() < .3, has_inspection=random.random() < .6) for l in listings}
for i in range(190):
    sid = str(uuid.uuid4())
    for _ in range(random.choice([1, 1, 2, 3])):
        ev('search_performed', sid, dict(care_levels=random.choice([[], ['ASSISTED'], ['MEMORY_CARE']]), has_budget_filter=random.random() < .3, has_location_filter=random.random() < .7, verified_only=random.random() < .15, medicaid_waiver=random.random() < .1, view=random.choice(['grid', 'grid', 'list', 'map']), result_count_bucket=random.choice(['1-5', '6-20', '21+', '0'])))
    if random.random() < .52:
        l = random.choice(listings); f = facts[l]
        ev('listing_clicked', sid, dict(listing_id=l, position=random.randint(1, 12), source='search', availability_state=f['availability_state'], has_photo=f['has_photo'], has_price=f['has_price'], claimed=f['claimed']), l)
        if random.random() < .9:
            ev('profile_viewed', sid, dict(listing_id=l, **f), l)
            p_start = .35 if f['availability_state'] == 'verified' else .18
            if random.random() < p_start:
                entry = random.choice(['rail', 'inline', 'cta_bar'])
                ev('inquiry_started', sid, dict(listing_id=l, entry=entry), l)
                if random.random() < .5:
                    ev('inquiry_submitted', sid, dict(listing_id=l, entry=entry), l)
            if random.random() < .07:
                ev('tour_requested', sid, dict(listing_id=l, entry='rail'), l)
    if random.random() < .06:
        ev('concierge_clicked', sid, dict(source_page=random.choice(['/', '/homes/[id]', '/search'])))
# direct profile visits (from Google etc.)
for i in range(45):
    sid = str(uuid.uuid4()); l = random.choice(listings); f = facts[l]
    ev('profile_viewed', sid, dict(listing_id=l, **f), l)
print("BEGIN;")
for r in rows:
    vals = ", ".join("NULL" if v is None else "'" + str(v).replace("'", "''") + "'" for v in r)
    print(f'INSERT INTO "AnalyticsEvent" (id, name, "listingId", "anonSessionId", "propsJson", "createdAt") VALUES ({vals});')
print("COMMIT;")
