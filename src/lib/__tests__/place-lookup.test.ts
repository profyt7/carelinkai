import {
  normalizeForMatch,
  nameMatchScore,
  isAggregatorUrl,
  evaluateCandidate,
} from "@/lib/place-lookup";

describe("normalizeForMatch", () => {
  it("strips suffix noise and punctuation", () => {
    expect(normalizeForMatch("Canterbury Commons Assisted Living, LLC")).toBe("canterbury commons");
    expect(normalizeForMatch("O'Neill Healthcare Lakewood")).toBe("oneill lakewood");
  });
});

describe("nameMatchScore", () => {
  it("scores strong overlap high and unrelated low", () => {
    expect(nameMatchScore("Canterbury Commons", "Canterbury Commons Senior Living")).toBeGreaterThanOrEqual(0.9);
    expect(nameMatchScore("Canterbury Commons", "Maple Grove Care Center")).toBeLessThan(0.3);
  });
});

describe("isAggregatorUrl", () => {
  it("flags directory/aggregator hosts and passes operator sites", () => {
    expect(isAggregatorUrl("https://www.aplaceformom.com/x")).toBe(true);
    expect(isAggregatorUrl("https://caring.com/listing/123")).toBe(true);
    expect(isAggregatorUrl("https://www.canterburycommons.com")).toBe(false);
    expect(isAggregatorUrl("not a url")).toBe(true); // unparseable → treat as aggregator/unusable
  });
});

describe("evaluateCandidate", () => {
  const input = { name: "Canterbury Commons", city: "Twinsburg", state: "OH" };

  it("returns HIGH when name + city both match a real site", () => {
    const r = evaluateCandidate(input, {
      id: "abc",
      displayName: { text: "Canterbury Commons" },
      websiteUri: "https://www.canterburycommons.com",
      formattedAddress: "123 Main St, Twinsburg, OH 44087",
    });
    expect(r).not.toBeNull();
    expect(r!.confidence).toBe("HIGH");
    expect(r!.url).toBe("https://www.canterburycommons.com");
  });

  it("returns null when the only website is an aggregator", () => {
    const r = evaluateCandidate(input, {
      id: "abc",
      displayName: { text: "Canterbury Commons" },
      websiteUri: "https://www.caring.com/senior-living/canterbury",
      formattedAddress: "123 Main St, Twinsburg, OH",
    });
    expect(r).toBeNull();
  });

  it("returns null when there is no website at all", () => {
    expect(evaluateCandidate(input, { id: "x", displayName: { text: "Canterbury Commons" } })).toBeNull();
  });

  it("downgrades to LOW when neither name nor city match", () => {
    const r = evaluateCandidate(input, {
      id: "z",
      displayName: { text: "Maple Grove Rehab" },
      websiteUri: "https://maplegroverehab.com",
      formattedAddress: "9 Elm Rd, Akron, OH",
    });
    expect(r).not.toBeNull();
    expect(r!.confidence).toBe("LOW");
  });
});
