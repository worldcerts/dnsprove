import { Static, Boolean, String, Literal, Record, Union, Partial } from "runtypes";

export const RecordTypesT = Literal("openatts");
export const AlgorithmT = Union(Literal("dns-did"));
export const VersionT = String;
export const PublicKeyT = String;

export const OpenAttestationDnsGenericRecordT = Record({
  algorithm: AlgorithmT,
  publicKey: PublicKeyT,
  version: VersionT,
}).And(
  Partial({
    dnssec: Boolean,
  })
);

export type OpenAttestationDnsGenericRecord = Static<typeof OpenAttestationDnsGenericRecordT>;
