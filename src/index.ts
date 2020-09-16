import axios from "axios";
import { Static, Boolean, String, Literal, Record, Union, Partial } from "runtypes";
import { getLogger } from "./util/logger";

const { trace, error } = getLogger("index");

const RecordTypes = Literal("openatts");
// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentionally naming the variable the same as the type
export type RecordTypes = Static<typeof RecordTypes>;

const BlockchainNetwork = Literal("ethereum");
// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentionally naming the variable the same as the type
export type BlockchainNetwork = Static<typeof BlockchainNetwork>;

const EthereumAddress = String.withConstraint((maybeAddress: string) => {
  return /0x[a-fA-F0-9]{40}/.test(maybeAddress) || `${maybeAddress} is not a valid ethereum address`;
});
// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentionally naming the variable the same as the type
export type EthereumAddress = Static<typeof EthereumAddress>;

enum EthereumNetworks {
  homestead = "1",
  ropsten = "3",
  rinkeby = "4",
}

const EthereumNetworkId = Union(
  Literal(EthereumNetworks.homestead),
  Literal(EthereumNetworks.ropsten),
  Literal(EthereumNetworks.rinkeby)
);
// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentionally naming the variable the same as the type
export type EthereumNetworkId = Static<typeof EthereumNetworkId>;

const OpenAttestationDNSTextRecord = Record({
  type: RecordTypes,
  net: BlockchainNetwork, // key names are directly lifted from the dns-txt record format
  netId: EthereumNetworkId, // they are abbreviated because of 255 char constraint on dns-txt records
  addr: EthereumAddress,
}).And(
  Partial({
    dnssec: Boolean,
  })
);
// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentionally naming the variable the same as the type
export type OpenAttestationDNSTextRecord = Static<typeof OpenAttestationDNSTextRecord>;

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
export const parseOpenAttestationRecord = (record: string): OpenAttestationDNSTextRecord => {
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
 * Returns true if the given object passes runtype validation for OpenAttestationDNSTextRecord
 * Turn on debug log to see exact validation failure messages if necessary
 * @param record An object that may conform to the OpenAttestationDNSTextRecord shape
 */
export const isWellFormedOpenAttestationRecord = (record: OpenAttestationDNSTextRecord) => {
  try {
    OpenAttestationDNSTextRecord.check(record);
    return true;
  } catch (e) {
    error(e);
    return false;
  }
};

/**
 * Takes a DNS-TXT Record set and returns openattestation document store records if any
 * @param recordSet Refer to tests for examples
 */
export const parseDnsResults = (recordSet: IDNSRecord[] = []): OpenAttestationDNSTextRecord[] => {
  trace(`Parsing DNS results: ${JSON.stringify(recordSet)}`);
  return recordSet
    .map((record) => record.data)
    .map((record) => record.slice(1, -1)) // removing leading and trailing quotes
    .filter(isOpenAttestationRecord)
    .map(parseOpenAttestationRecord)
    .filter(isWellFormedOpenAttestationRecord);
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
