import { DNSoverHTTPS } from "dohdec";
import { getLogger } from "./util/logger";

const { trace } = getLogger("index");

const DoHResolver = new DNSoverHTTPS();

type RecordTypes = "openatts";

type BlockchainNetwork = "ethereum";

type EthereumAddress = string;

enum EthereumNetworkIds {
  homestead = 1,
  ropsten = 3
}
interface OpenAttestationsDNSTextRecord {
  type: RecordTypes;
  net: BlockchainNetwork;
  netId: EthereumNetworkIds;
  address: EthereumAddress;
  dnssec: boolean;
}

/**
 * Returns true for strings that are openattestation records
 * @param txtDataString e.g: '"openatts net=ethereum netId=3 address=0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC"'
 */
const isOpenAttestationsRecord = (txtDataString: string) => {
  return txtDataString.startsWith('"openatts');
};

/**
 * Takes a string in the format of "key=value" and adds it to a JS object as key: value
 * @param obj Object that will be modified
 * @param keyValuePair
 */
const addKeyValuePairToObject = (obj: any, keyValuePair: string): any => {
  const [key, value] = keyValuePair.split("=", 2);
  /* eslint-disable no-param-reassign */
  // this is necessary because we modify the accumulator in .reduce
  obj[key] = value;

  return obj;
};

/**
 * Parses one openattestation DNS-TXT record and turns it into an OpenAttestationsDNSTextRecord object
 * @param record e.g: '"openatts net=ethereum netId=3 address=0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC"'
 */
const parseOpenAttestationsRecord = (record: string): OpenAttestationsDNSTextRecord => {
  trace(`Parsing record: ${record}`);
  const keyValuePairs = record
    .slice(1, -1) // remove the leading and trailing quotes
    .split(" ") // tokenize into key=value elements
    .slice(1); // remove the leading 'openatts' token
  const recordObject = {} as OpenAttestationsDNSTextRecord;
  keyValuePairs.reduce<OpenAttestationsDNSTextRecord>(addKeyValuePairToObject, recordObject);
  recordObject.type = "openatts";
  return recordObject;
};

/**
 * Currying function that applies a given dnssec result
 */
const applyDnssecResults = (
  dnssecStatus: boolean
): ((record: OpenAttestationsDNSTextRecord) => OpenAttestationsDNSTextRecord) => {
  return (record: OpenAttestationsDNSTextRecord) => {
    record.dnssec = dnssecStatus;
    return record;
  };
};

/**
 * Takes a DNS-TXT Record set and returns openattestation document store records if any
 * @param recordSet Refer to tests for examples
 */
export const parseDnsResults = (recordSet: any[] = []): OpenAttestationsDNSTextRecord[] => {
  trace(`Parsing DNS results: ${JSON.stringify(recordSet)}`);
  return recordSet
    .filter(record => isOpenAttestationsRecord(record.data))
    .map(record => record.data)
    .map<OpenAttestationsDNSTextRecord>(parseOpenAttestationsRecord);
};

/**
 * Queries a given domain and parses the results to retrieve openattestation document store records if any
 * @param domain e.g: "ruijiechow.com", "documentstores.openattestation.com"
 */
export const getCertStoreRecords = async (domain: string): Promise<OpenAttestationsDNSTextRecord[]> => {
  trace(`Received request to resolve ${domain}`);
  const opts = {
    rrtype: "TXT",
    dnssec: true
  };
  const results = await DoHResolver.lookup(domain, opts);
  trace(`Lookup results: ${JSON.stringify(results)}`);

  return parseDnsResults(results.Answer).map<OpenAttestationsDNSTextRecord>(applyDnssecResults(results.RA));
};
