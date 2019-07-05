import { getCertStoreRecords, parseDnsResults } from ".";

const sampleDnsTextRecord = {
  type: "openatts",
  net: "ethereum",
  netId: "3",
  address: "0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC"
};

describe("getCertStoreRecords", () => {
  const sampleDnsTextRecordWithDnssec = {
    type: "openatts",
    net: "ethereum",
    netId: "3",
    dnssec: true,
    address: "0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC"
  };
  test("it should work", async () => {
    expect(await getCertStoreRecords("ruijiechow.com")).toStrictEqual([sampleDnsTextRecordWithDnssec]);
  });

  test("it should return an empty array if there is no openatt record", async () => {
    expect(await getCertStoreRecords("google.com")).toStrictEqual([]);
  });

  test("it should return an empty array with a non-existent domain", async () => {
    expect(await getCertStoreRecords("thisdoesnotexist.gov.sg")).toStrictEqual([]);
  });
});

describe("parseDnsResults", () => {
  test("it should work", () => {
    const sampleRecord = [
      {
        name: "ruijiechow.com.",
        type: 16,
        TTL: 110,
        data: '"openatts net=ethereum netId=3 address=0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC"'
      }
    ];
    expect(parseDnsResults(sampleRecord)).toStrictEqual([sampleDnsTextRecord]);
  });
  test("it should return the correct results if there is more than one openatts record", () => {
    const sampleRecord = [
      {
        name: "ruijiechow.com.",
        type: 16,
        TTL: 110,
        data: '"openatts net=ethereum netId=3 address=0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC"'
      },
      {
        name: "ruijiechow.com.",
        type: 16,
        TTL: 110,
        data: '"openatts net=ethereum netId=1 address=0x007d40224f6562461633ccfbaffd359ebb2fc9ba"'
      }
    ];

    expect(parseDnsResults(sampleRecord)).toStrictEqual([
      {
        address: "0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC",
        net: "ethereum",
        netId: "3",
        type: "openatts"
      },
      {
        address: "0x007d40224f6562461633ccfbaffd359ebb2fc9ba",
        net: "ethereum",
        netId: "1",
        type: "openatts"
      }
    ]);
  });
});
