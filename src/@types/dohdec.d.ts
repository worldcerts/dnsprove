declare module "dohdec" {
  interface constructorOpts {
    url: string;
    userAgent: string;
  }

  interface lookupOpts {
    name?: string;
    rrtype?: string;
    json?: boolean;
    decode?: boolean;
    preferPost?: boolean;
    dnssec?: boolean;
  }

  interface LookupResponse {
    Status: number;
    TC: boolean;
    RD: boolean;
    RA: boolean;
    AD: boolean;
    Cd: boolean;
    Question: any[];
    Answer: Answer;
  }

  type Answer = Array<DNSRecord>;

  interface DNSRecord {
    name: string;
    type: number;
    TTL: number;
    data: string;
  }

  export class DNSoverHTTPS {
    constructor(opts?: constructorOpts);

    lookup(name: string, opts?: lookupOpts): Promise<LookupResponse>;
  }
}
