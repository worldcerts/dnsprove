
# Requirements

- facilitate the retrieving of a cert store for a given dns

input: domain name
output: record(s)

(domain: string) => [ records ]

example:

record: {
    type: opencerts
    network: ethereum
    networkId: 3
    address: 0xabcdf
    dnssec: false
}

