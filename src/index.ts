import axios from "axios";
import { getLogger } from "./util/logger";

const { trace } = getLogger("index");

export type RecordTypes = "openatts";
export type BlockchainNetwork = "ethereum";
export type EthereumAddress = string;

export enum EthereumNetworkId {
  homestead = "1",
  ropsten = "3",
  rinkeby = "4"
}
export interface OpenAttestationDNSTextRecord {
  type: RecordTypes;
  net: BlockchainNetwork; // key names are directly lifted from the dns-txt record format
  netId: EthereumNetworkId; // they are abbreviated because of 255 char constraint on dns-txt records
  addr: EthereumAddress;
  dnssec: boolean;
}

export interface IDNSRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

export interface IDNSQueryResponse {
  AD: boolean; // Whether all response data was validated with DNSSEC,
  Answer: IDNSRecord[];
}

/**
 * Returns true for strings that are openattestation records
 * @param txtDataString e.g: '"openatts net=ethereum netId=3 addr=0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC"'
 */
const isOpenAttestationRecord = (txtDataString: string) => {
  return txtDataString.startsWith("openatts");
};

/**
 * Takes a string in the format of "key=value" and adds it to a JS object as key: value
 * @param obj Object that will be modified
 * @param keyValuePair A key value pair to add to the given object
 * @example addKeyValuePairToObject(objectToModify, "foo=bar")
 */
const addKeyValuePairToObject = (obj: any, keyValuePair: string): any => {
  const [key, ...values] = keyValuePair.split("=");
  const value = values.join("="); // in case there were values with = in them
  /* eslint-disable no-param-reassign */
  // this is necessary because we modify the accumulator in .reduce
  obj[key.trim()] = value.trim();

  return obj;
};

/**
 * Parses one openattestation DNS-TXT record and turns it into an OpenAttestationsDNSTextRecord object
 * @param record e.g: '"openatts net=ethereum netId=3 addr=0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC"'
 */
const parseOpenAttestationRecord = (record: string): OpenAttestationDNSTextRecord => {
  trace(`Parsing record: ${record}`);
  const keyValuePairs = record.trim().split(" "); // tokenize into key=value elements
  const recordObject = {} as OpenAttestationDNSTextRecord;
  // @ts-ignore: we already checked for this token
  recordObject.type = keyValuePairs.shift();
  keyValuePairs.reduce<OpenAttestationDNSTextRecord>(addKeyValuePairToObject, recordObject);
  return recordObject;
};

/**
 * Currying function that applies a given dnssec result
 */
const applyDnssecResults = (dnssecStatus: boolean) => (
  record: OpenAttestationDNSTextRecord
): OpenAttestationDNSTextRecord => {
  return { ...record, dnssec: dnssecStatus };
};

/**
 * Takes a DNS-TXT Record set and returns openattestation document store records if any
 * @param recordSet Refer to tests for examples
 */
export const parseDnsResults = (recordSet: IDNSRecord[] = []): OpenAttestationDNSTextRecord[] => {
  trace(`Parsing DNS results: ${JSON.stringify(recordSet)}`);
  return recordSet
    .map(record => record.data)
    .map(record => record.slice(1, -1)) // removing leading and trailing quotes
    .filter(isOpenAttestationRecord)
    .map(parseOpenAttestationRecord);
};

/**
 * Queries a given domain and parses the results to retrieve openattestation document store records if any
 * @param domain e.g: "example.openattestation.com"
 * @example
 * > getDocumentStoreRecords("example.openattestation.com")
 * > [ { type: 'openatts',
    net: 'ethereum',
    netId: '3',
    addr: '0x2f60375e8144e16Adf1979936301D8341D58C36C',
    dnssec: true } ]
 */
export const getDocumentStoreRecords = async (domain: string): Promise<OpenAttestationDNSTextRecord[]> => {
  trace(`Received request to resolve ${domain}`);

  const query: { data: IDNSQueryResponse } = await axios.get(`https://dns.google/resolve?name=${domain}&type=TXT`);
  const results = query.data;
  const answers = results.Answer || [];

  trace(`Lookup results: ${JSON.stringify(answers)}`);

  return parseDnsResults(answers).map(applyDnssecResults(results.AD));
};
