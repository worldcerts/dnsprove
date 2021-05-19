import { getDocumentStoreRecords, parseDocumentStoreResults, getDnsDidRecords } from ".";

describe("getCertStoreRecords", () => {
  const sampleDnsTextRecordWithDnssec = {
    type: "openatts",
    net: "ethereum",
    netId: "3",
    dnssec: false,
    addr: "0x2f60375e8144e16Adf1979936301D8341D58C36C",
  };
  test("it should work", async () => {
    const records = await getDocumentStoreRecords("donotuse.openattestation.com");
    expect(records).toStrictEqual([sampleDnsTextRecordWithDnssec]);
  });

  test("it should return an empty array if there is no openatts record", async () => {
    expect(await getDocumentStoreRecords("google.com")).toStrictEqual([]);
  });

  test("it should return an empty array with a non-existent domain", async () => {
    expect(await getDocumentStoreRecords("thisdoesnotexist.gov.sg")).toStrictEqual([]);
  });
});

describe("getDnsDidRecords", () => {
  test("it should work", async () => {
    const records = await getDnsDidRecords("donotuse.openattestation.com");
    expect(records).toStrictEqual([
      {
        type: "openatts",
        algorithm: "dns-did",
        publicKey: "did:ethr:0xE712878f6E8d5d4F9e87E10DA604F9cB564C9a89#controller",
        version: "1.0",
        dnssec: false,
      },
    ]);
  });

  test("it should return an empty array if there is no openatts record", async () => {
    const records = await getDnsDidRecords("google.com");
    expect(records).toStrictEqual([]);
  });

  test("it should return an empty array with a non-existent domain", async () => {
    const records = await getDnsDidRecords("thisdoesnotexist.gov.sg");
    expect(records).toStrictEqual([]);
  });
});

describe("parseDocumentStoreResults", () => {
  test("it should return one record in an array if there is one openatts record", () => {
    const sampleRecord = [
      {
        name: "example.openattestation.com.",
        type: 16,
        TTL: 110,
        data: '"openatts net=ethereum netId=3 addr=0x2f60375e8144e16Adf1979936301D8341D58C36C"',
        dnssec: true,
      },
    ];
    expect(parseDocumentStoreResults(sampleRecord, true)).toStrictEqual([
      {
        type: "openatts",
        net: "ethereum",
        netId: "3",
        addr: "0x2f60375e8144e16Adf1979936301D8341D58C36C",
        dnssec: true,
      },
    ]);
  });
  test("it should correctly handle cases where the TXT record is not double quoted", () => {
    const sampleRecord = [
      {
        name: "example.openattestation.com.",
        type: 16,
        TTL: 110,
        data: "openatts net=ethereum netId=3 addr=0x2f60375e8144e16Adf1979936301D8341D58C36C",
        dnssec: true,
      },
    ];
    expect(parseDocumentStoreResults(sampleRecord, true)).toStrictEqual([
      {
        type: "openatts",
        net: "ethereum",
        netId: "3",
        addr: "0x2f60375e8144e16Adf1979936301D8341D58C36C",
        dnssec: true,
      },
    ]);
  });
  test("it should return two record items if there are two openatts record", () => {
    const sampleRecord = [
      {
        name: "example.openattestation.com.",
        type: 16,
        TTL: 110,
        data: '"openatts net=ethereum netId=3 addr=0x2f60375e8144e16Adf1979936301D8341D58C36C"',
        dnssec: true,
      },
      {
        name: "example.openattestation.com.",
        type: 16,
        TTL: 110,
        data: '"openatts net=ethereum netId=1 addr=0x007d40224f6562461633ccfbaffd359ebb2fc9ba"',
        dnssec: true,
      },
    ];

    expect(parseDocumentStoreResults(sampleRecord, true)).toStrictEqual([
      {
        addr: "0x2f60375e8144e16Adf1979936301D8341D58C36C",
        net: "ethereum",
        netId: "3",
        type: "openatts",
        dnssec: true,
      },
      {
        addr: "0x007d40224f6562461633ccfbaffd359ebb2fc9ba",
        net: "ethereum",
        netId: "1",
        type: "openatts",
        dnssec: true,
      },
    ]);
  });
  test("it should omit malformed records even if it has openatts header", () => {
    const sampleRecord = [
      {
        name: "example.openattestation.com.",
        type: 16,
        TTL: 110,
        data: '"openatts foobarbar"',
        dnssec: true,
      },
      {
        name: "example.openattestation.com.",
        type: 16,
        TTL: 110,
        data: '"openatts net=ethereum netId=1 addr=0x007d40224f6562461633ccfbaffd359ebb2fc9ba"',
        dnssec: true,
      },
    ];
    expect(parseDocumentStoreResults(sampleRecord, true)).toStrictEqual([
      {
        addr: "0x007d40224f6562461633ccfbaffd359ebb2fc9ba",
        net: "ethereum",
        netId: "1",
        type: "openatts",
        dnssec: true,
      },
    ]);
  });
  test("should not return a record if addr fails ethereum regex", () => {
    const sampleRecord = [
      {
        name: "example.openattestation.com.",
        type: 16,
        TTL: 110,
        data: '"openatts net=ethereum netId=3 addr=0x2f60375e8144e16Adf19=79936301D8341D58C36C"',
        dnssec: true,
      },
    ];
    expect(parseDocumentStoreResults(sampleRecord, true)).toStrictEqual([]);
  });
});
