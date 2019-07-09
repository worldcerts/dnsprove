import { getDocumentStoreRecords, parseDnsResults } from "./index";

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
    expect(await getDocumentStoreRecords("ruijiechow.com")).toStrictEqual([sampleDnsTextRecordWithDnssec]);
  });

  test("it should return an empty array if there is no openatts record", async () => {
    expect(await getDocumentStoreRecords("google.com")).toStrictEqual([]);
  });

  test("it should return an empty array with a non-existent domain", async () => {
    expect(await getDocumentStoreRecords("thisdoesnotexist.gov.sg")).toStrictEqual([]);
  });
});

describe("parseDnsResults", () => {
  test("it should return one record in an array if there is one openatts record", () => {
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
  test("it should not mangle records with = in it", () => {
    const sampleRecord = [
      {
        name: "ruijiechow.com.",
        type: 16,
        TTL: 110,
        data: '"openatts net=ethereum=classic netId=3 address=0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC"'
      }
    ];
    expect(parseDnsResults(sampleRecord)).toStrictEqual([
      {
        type: "openatts",
        net: "ethereum=classic",
        netId: "3",
        address: "0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC"
      }
    ]);
  });
  test("it should return two record items if there are two openatts record", () => {
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
