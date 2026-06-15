import { CareLevel } from "@prisma/client";
import {
  sanitizeCareLevels,
  parseLocation,
  buildLocationWhere,
} from "@/lib/discharge-planner/criteria";

describe("sanitizeCareLevels", () => {
  it("maps the legacy ASSISTED_LIVING value onto the real ASSISTED enum", () => {
    // This is the value the AI parser used to emit that crashed Prisma.
    expect(sanitizeCareLevels(["ASSISTED_LIVING"])).toEqual([CareLevel.ASSISTED]);
  });

  it("passes through valid enum values unchanged", () => {
    expect(sanitizeCareLevels(["MEMORY_CARE", "SKILLED_NURSING"])).toEqual([
      CareLevel.MEMORY_CARE,
      CareLevel.SKILLED_NURSING,
    ]);
  });

  it("normalizes loose casing/spacing and common synonyms", () => {
    expect(sanitizeCareLevels(["assisted living", "Memory", "nursing"])).toEqual([
      CareLevel.ASSISTED,
      CareLevel.MEMORY_CARE,
      CareLevel.SKILLED_NURSING,
    ]);
  });

  it("drops unknown values and de-duplicates", () => {
    expect(
      sanitizeCareLevels(["ASSISTED", "ASSISTED_LIVING", "SOMETHING_ELSE"])
    ).toEqual([CareLevel.ASSISTED]);
  });

  it("returns an empty array for nullish / non-array input", () => {
    expect(sanitizeCareLevels(undefined)).toEqual([]);
    expect(sanitizeCareLevels(null)).toEqual([]);
    expect(sanitizeCareLevels([])).toEqual([]);
  });
});

describe("parseLocation", () => {
  it("splits 'City, ST' into city and state", () => {
    expect(parseLocation("San Francisco, CA")).toEqual({
      city: "San Francisco",
      state: "CA",
    });
  });

  it("normalizes a full state name to its abbreviation", () => {
    expect(parseLocation("Boston, Massachusetts")).toEqual({
      city: "Boston",
      state: "MA",
    });
  });

  it("treats a single token as a city", () => {
    expect(parseLocation("Cleveland")).toEqual({ city: "Cleveland" });
  });

  it("returns empty object for blank input", () => {
    expect(parseLocation("")).toEqual({});
    expect(parseLocation(undefined)).toEqual({});
  });
});

describe("buildLocationWhere", () => {
  it("requires both city and state to match when both are present", () => {
    const where = buildLocationWhere("San Francisco, CA");
    expect(where).toEqual({
      AND: [
        { city: { contains: "San Francisco", mode: "insensitive" } },
        { state: { contains: "CA", mode: "insensitive" } },
      ],
    });
  });

  it("matches a single token against either city or state", () => {
    const where = buildLocationWhere("Cleveland");
    expect(where).toEqual({
      OR: [
        { city: { contains: "Cleveland", mode: "insensitive" } },
        { state: { contains: "Cleveland", mode: "insensitive" } },
      ],
    });
  });

  it("returns undefined when there is no usable location", () => {
    expect(buildLocationWhere("")).toBeUndefined();
    expect(buildLocationWhere(undefined)).toBeUndefined();
  });
});
