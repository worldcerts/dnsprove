import axios from "axios";
import { OpenAttestationDNSTextRecord, OpenAttestationDNSTextRecordT } from "./records/dnsTxt";
import { OpenAttestationDnsDidRecord, OpenAttestationDnsDidRecordT } from "./records/dnsDid";
import { getLogger } from "./util/logger";

const { trace } = getLogger("index");

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

interface GenericObject {
  [key: string]: string;
}

/**
 * Returns true for strings that are openattestation records
 * @param txtDataString e.g: '"worldatts net=ethereum netId=3 addr=0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC"'
 */
const isOpenAttestationRecord = (txtDataString: string) => {
  return txtDataString.startsWith("worldatts");
};

const trimValue = (str: string) => {
  return str.endsWith(";") ? str.substring(0, str.length - 1).trim() : str.trim();
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
  obj[key.trim()] = trimValue(value);

  return obj;
};

const formatDnsDidRecord = ({ a, v, p, type }: { [key: string]: string }) => {
  return {
    type,
    algorithm: a,
    publicKey: p,
    version: v,
  };
};

export const queryDns = async (domain: string): Promise<IDNSQueryResponse> => {
  const { data } = await axios.get<IDNSQueryResponse>(`https://dns.google/resolve?name=${domain}&type=TXT`);
  return data;
};

/**
 * Parses one openattestation DNS-TXT record and turns it into an OpenAttestationsDNSTextRecord object
 * @param record e.g: '"worldatts net=ethereum netId=3 addr=0x0c9d5E6C766030cc6f0f49951D275Ad0701F81EC"'
 */
export const parseOpenAttestationRecord = (record: string): GenericObject => {
  trace(`Parsing record: ${record}`);
  const keyValuePairs = record.trim().split(" "); // tokenize into key=value elements
  const recordObject = {} as GenericObject;
  // @ts-ignore: we already checked for this token
  recordObject.type = keyValuePairs.shift();
  keyValuePairs.reduce<GenericObject>(addKeyValuePairToObject, recordObject);
  return recordObject;
};

/**
 * Currying function that applies a given dnssec result
 */
const applyDnssecResults = <T>(dnssecStatus: boolean) => (record: T): T => {
  return { ...record, dnssec: dnssecStatus };
};

/**
 * Some DNS servers return TXT records with quoted strings, others don't :D
 * @param record
 * @returns unquoted DNS record
 */
const trimDoubleQuotes = (record: string) => {
  return record.startsWith('"') ? record.slice(1, -1) : record;
};

/**
 * Takes a record set and breaks that info array of key value pairs
 * @param recordSet e.g: [{name: "google.com", type: 16, TTL: 3599, data: '"worldatts net=ethereum netId=3 addr=0x2f60375e8144e16Adf1979936301D8341D58C36C"}]
 */
const parseOpenAttestationRecords = (recordSet: IDNSRecord[] = []): GenericObject[] => {
  trace(`Parsing DNS results: ${JSON.stringify(recordSet)}`);
  return recordSet
    .map((record) => record.data)
    .map(trimDoubleQuotes) // removing leading and trailing quotes if they exist
    .filter(isOpenAttestationRecord)
    .map(parseOpenAttestationRecord);
};

/**
 * Takes a DNS-TXT Record set and returns openattestation document store records if any
 * @param recordSet Refer to tests for examples
 */
export const parseDocumentStoreResults = (
  recordSet: IDNSRecord[] = [],
  dnssec: boolean
): OpenAttestationDNSTextRecord[] => {
  return parseOpenAttestationRecords(recordSet)
    .reduce((prev, curr) => {
      return OpenAttestationDNSTextRecordT.guard(curr) ? [...prev, curr] : prev;
    }, [] as OpenAttestationDNSTextRecord[])
    .map(applyDnssecResults(dnssec));
};

export const parseDnsDidResults = (recordSet: IDNSRecord[] = [], dnssec: boolean): OpenAttestationDnsDidRecord[] => {
  return parseOpenAttestationRecords(recordSet)
    .map(formatDnsDidRecord)
    .reduce((prev, curr) => {
      return OpenAttestationDnsDidRecordT.guard(curr) ? [...prev, curr] : prev;
    }, [] as OpenAttestationDnsDidRecord[])
    .map(applyDnssecResults(dnssec));
};

/**
 * Queries a given domain and parses the results to retrieve openattestation document store records if any
 * @param domain e.g: "example.openattestation.com"
 * @example
 * > getDocumentStoreRecords("example.openattestation.com")
 * > [ { type: 'worldatts',
    net: 'ethereum',
    netId: '3',
    addr: '0x2f60375e8144e16Adf1979936301D8341D58C36C',
    dnssec: true } ]
 */
export const getDocumentStoreRecords = async (domain: string): Promise<OpenAttestationDNSTextRecord[]> => {
  trace(`Received request to resolve ${domain}`);

  const results = await queryDns(domain);
  const answers = results.Answer || [];

  trace(`Lookup results: ${JSON.stringify(answers)}`);

  return parseDocumentStoreResults(answers, results.AD);
};

export const getDnsDidRecords = async (domain: string): Promise<OpenAttestationDnsDidRecord[]> => {
  trace(`Received request to resolve ${domain}`);

  const results = await queryDns(domain);
  const answers = results.Answer || [];

  trace(`Lookup results: ${JSON.stringify(answers)}`);

  return parseDnsDidResults(answers, results.AD);
};

export { OpenAttestationDNSTextRecord, OpenAttestationDnsDidRecord };
