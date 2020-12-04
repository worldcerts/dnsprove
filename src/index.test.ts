import { getDocumentStoreRecords, parseDnsResults } from "./index";

const sampleDnsTextRecord = {
  type: "worldatts",
  net: "ethereum",
  netId: "3",
  addr: "0x2f60375e8144e16Adf1979936301D8341D58C36C"
};

describe("getCertStoreRecords", () => {
  const sampleDnsTextRecordWithDnssec = {
    type: "worldatts",
    net: "ethereum",
    netId: "3",
    dnssec: false,
    addr: "0x2f60375e8144e16Adf1979936301D8341D58C36C"
  };
  test("it should work", async () => {
    // added because needed for the test but might need to remove
    const sampleToRemove = {
      addr: "0x53f3a47C129Ea30D80bC727556b015F02bE63811",
      dnssec: false,
      net: "ethereum",
      netId: "3",
      type: "worldatts"
    };
    expect(await getDocumentStoreRecords("example.openattestation.com")).toStrictEqual([
      sampleDnsTextRecordWithDnssec,
      sampleToRemove
    ]);
  });

  test("it should return an empty array if there is no worldatts record", async () => {
    expect(await getDocumentStoreRecords("google.com")).toStrictEqual([]);
  });

  test("it should return an empty array with a non-existent domain", async () => {
    expect(await getDocumentStoreRecords("thisdoesnotexist.gov.sg")).toStrictEqual([]);
  });
});

describe("parseDnsResults", () => {
  test("it should return one record in an array if there is one worldatts record", () => {
    const sampleRecord = [
      {
        name: "example.openattestation.com.",
        type: 16,
        TTL: 110,
        data: '"worldatts net=ethereum netId=3 addr=0x2f60375e8144e16Adf1979936301D8341D58C36C"'
      }
    ];
    expect(parseDnsResults(sampleRecord)).toStrictEqual([sampleDnsTextRecord]);
  });
  test("it should not mangle records with = in it", () => {
    const sampleRecord = [
      {
        name: "example.openattestation.com.",
        type: 16,
        TTL: 110,
        data: '"worldatts net=ethereum=classic netId=3 addr=0x2f60375e8144e16Adf1979936301D8341D58C36C"'
      }
    ];
    expect(parseDnsResults(sampleRecord)).toStrictEqual([
      {
        type: "worldatts",
        net: "ethereum=classic",
        netId: "3",
        addr: "0x2f60375e8144e16Adf1979936301D8341D58C36C"
      }
    ]);
  });
  test("it should return two record items if there are two worldatts record", () => {
    const sampleRecord = [
      {
        name: "example.openattestation.com.",
        type: 16,
        TTL: 110,
        data: '"worldatts net=ethereum netId=3 addr=0x2f60375e8144e16Adf1979936301D8341D58C36C"'
      },
      {
        name: "example.openattestation.com.",
        type: 16,
        TTL: 110,
        data: '"worldatts net=ethereum netId=1 addr=0x007d40224f6562461633ccfbaffd359ebb2fc9ba"'
      }
    ];

    expect(parseDnsResults(sampleRecord)).toStrictEqual([
      {
        addr: "0x2f60375e8144e16Adf1979936301D8341D58C36C",
        net: "ethereum",
        netId: "3",
        type: "worldatts"
      },
      {
        addr: "0x007d40224f6562461633ccfbaffd359ebb2fc9ba",
        net: "ethereum",
        netId: "1",
        type: "worldatts"
      }
    ]);
  });
});
