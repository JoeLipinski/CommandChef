/**
 * @file defaultCommands.ts
 * @description Defines the default library of commands and modifiers available in the application.
 */

export const defaultCommands = [
  // Cryptography
  {
    id: "openssl-create-csr",
    category: "Cryptography",
    label: "OpenSSL (Create CSR)",
    description: "Create a Certificate Signing Request (CSR) for a given private key.",
    template: "openssl req -new -key {{private_key}} -out {{csr_filename}}",
    docsUrl: "https://www.openssl.org/docs/man1.1.1/man1/req.html",
    type: "command",
    keywords: ["openssl", "csr", "certificate", "signing", "request", "crypto", "create"],
    options: [
      { name: "private_key", label: "Private Key File", type: "text", required: true, description: "Path to the private key to use for the CSR." },
      { name: "csr_filename", label: "Output CSR Filename", type: "text", required: true, description: "Filename for the new CSR file." },
    ],
    variants: [
        {
            id: "openssl-create-csr-default",
            label: "Default filenames",
            description: "Uses 'private.key' and 'request.csr' as default filenames.",
            prefilled: { required: { private_key: 'private.key', csr_filename: 'request.csr' } }
        }
    ]
  },
  {
    id: "openssl-gen-rsa",
    category: "Cryptography",
    label: "OpenSSL (Gen RSA Key)",
    description: "Generate an RSA private key.",
    template: "openssl genrsa -out {{filename}} {{bits}}",
    docsUrl: "https://www.openssl.org/docs/man1.1.1/man1/genrsa.html",
    type: "command",
    keywords: ["openssl", "rsa", "key", "generate", "crypto", "private key"],
    options: [
      { name: "filename", label: "Output Key Filename", type: "text", required: true },
      { name: "bits", label: "Key Size (bits)", type: "text", required: true },
    ],
    variants: [
      {
        id: "openssl-gen-rsa-2048",
        label: "Generate 2048-bit RSA key",
        prefilled: { required: { filename: 'private.key', bits: '2048' } }
      },
      {
        id: "openssl-gen-rsa-4096",
        label: "Generate 4096-bit RSA key",
        prefilled: { required: { filename: 'private_4096.key', bits: '4096' } }
      }
    ]
  },
  // Discovery & Enumeration
  {
    id: "amass-enum",
    category: "Discovery & Enumeration",
    label: "Amass",
    description: "In-depth attack surface mapping and asset discovery tool.",
    template: "amass enum -d {{domain}}",
    docsUrl: "https://github.com/owasp-amass/amass",
    type: "command",
    keywords: ["amass", "subdomain", "enumeration", "discovery"],
    options: [
      { name: "domain", label: "Domain", type: "text", required: true, description: "The domain to enumerate subdomains for." },
      { name: "passive", label: "Passive Scan", type: "checkbox", required: false, flag: "--passive", description: "Perform a passive scan using online sources only." },
      { name: "active", label: "Active Scan", type: "checkbox", required: false, flag: "--active", description: "Perform active reconnaissance techniques (e.g., DNS brute-forcing)." },
      { name: "output_file", label: "Output File", type: "text", required: false, flag: "-o", description: "Save the results to a file." },
    ],
    variants: [
        {
            id: 'amass-passive',
            label: 'Passive enumeration',
            description: "A safe scan using only passive techniques.",
            prefilled: { optional: [{ id: 1, name: 'passive', label: 'Passive Scan', type: 'checkbox', flag: '--passive', value: true }] }
        }
    ]
  },
  {
    id: "dig-run",
    category: "Discovery & Enumeration",
    label: "dig",
    description: "DNS lookup utility.",
    template: "dig {{domain}}",
    docsUrl: "https://man.cx/dig",
    type: "command",
    keywords: ["dig", "dns", "lookup", "domain"],
    options: [
      { name: "domain", label: "Domain", type: "text", required: true },
      { 
        name: "record_type", 
        label: "Record Type", 
        type: "select", 
        required: false, 
        choices: [
          { label: "A Record", value: "A" },
          { label: "AAAA Record", value: "AAAA" },
          { label: "MX Record", value: "MX" },
          { label: "TXT Record", value: "TXT" },
          { label: "NS Record", value: "NS" },
          { label: "ANY Record", value: "ANY" }
        ]
      },
    ],
    variants: [
        {
            id: 'dig-any',
            label: 'Query ANY record',
            prefilled: { 
              optional: [{ 
                id: 1, 
                name: 'record_type', 
                label: 'Record Type', 
                type: 'select', 
                flag: '', 
                value: 'ANY', 
                choices: [
                  { label: "A Record", value: "A" },
                  { label: "AAAA Record", value: "AAAA" },
                  { label: "MX Record", value: "MX" },
                  { label: "TXT Record", value: "TXT" },
                  { label: "NS Record", value: "NS" },
                  { label: "ANY Record", value: "ANY" }
                ]
              }] 
            }
        }
    ]
  },
  {
    id: "nmap-scan",
    category: "Discovery & Enumeration",
    label: "Nmap",
    description: "The Nmap Security Scanner is a free and open source utility for network discovery and security auditing.",
    template: "nmap {{target}}",
    docsUrl: "https://nmap.org/book/man.html",
    type: "command",
    keywords: ["nmap", "scan", "port", "network", "security"],
    options: [
      { name: "target", label: "Target", type: "text", required: true, description: "Specifies the target hosts to be scanned." },
      { name: "ports", label: "Ports", type: "text", required: false, flag: "-p", description: "Only scan specified ports. Ex: -p22; -p1-65535; -pU:53,111,137,T:21-25,80,139,8080" },
      { 
        name: "scan_type", 
        label: "Scan Type (-s)", 
        type: "select", 
        required: false, 
        flag: "-s", 
        choices: [
          { label: "TCP SYN Scan", value: "S" },
          { label: "TCP Connect Scan", value: "T" },
          { label: "UDP Scan", value: "U" },
          { label: "TCP ACK Scan", value: "A" },
          { label: "TCP FIN Scan", value: "F" }
        ], 
        description: "Specifies the scan type (e.g., TCP SYN, Connect, UDP, ACK, FIN)." 
      },
      { 
        name: "timing", 
        label: "Timing Template (-T)", 
        type: "select", 
        required: false, 
        flag: "-T", 
        choices: [
          { label: "Paranoid (0)", value: "0" },
          { label: "Sneaky (1)", value: "1" },
          { label: "Polite (2)", value: "2" },
          { label: "Normal (3)", value: "3" },
          { label: "Aggressive (4)", value: "4" },
          { label: "Insane (5)", value: "5" }
        ], 
        description: "Set timing template (higher is faster). T0=paranoid, T1=sneaky, T2=polite, T3=normal, T4=aggressive, T5=insane." 
      },
      { name: "version_detection", label: "Version Detection (-sV)", type: "checkbox", required: false, flag: "-sV", description: "Probe open ports to determine service/version info." },
      { name: "os_detection", label: "OS Detection (-O)", type: "checkbox", required: false, flag: "-O", description: "Enable operating system detection." },
      { 
        name: "script_scan", 
        label: "Script Scan (--script)", 
        type: "select", 
        required: false, 
        flag: "--script", 
        choices: [
          { label: "Vulnerability Scripts", value: "vuln" },
          { label: "Default Scripts", value: "default" },
          { label: "Authentication Scripts", value: "auth" },
          { label: "Discovery Scripts", value: "discovery" }
        ], 
        description: "Run a script scan using the specified category of scripts." 
      },
      { name: "aggressive", label: "Aggressive Scan (-A)", type: "checkbox", required: false, flag: "-A", description: "Enable aggressive options. Equivalent to -O -sV -sC --traceroute." },
      { name: "verbose", label: "Verbose (-v)", type: "checkbox", required: false, flag: "-v", description: "Increase verbosity level." },
      { name: "custom_flags", label: "Custom Flags", type: "text", required: false, description: "Any additional flags not covered by other options." },
    ],
    variants: [
        {
            id: 'nmap-quick',
            label: 'Quick Scan',
            description: "A fast scan using timing template 4.",
            prefilled: { 
              optional: [{ 
                id: 1, 
                name: 'timing', 
                label: 'Timing Template (-T)', 
                type: 'select', 
                flag: '-T', 
                value: '4', 
                choices: [
                  { label: "Paranoid (0)", value: "0" },
                  { label: "Sneaky (1)", value: "1" },
                  { label: "Polite (2)", value: "2" },
                  { label: "Normal (3)", value: "3" },
                  { label: "Aggressive (4)", value: "4" },
                  { label: "Insane (5)", value: "5" }
                ]
              }] 
            }
        },
        {
            id: 'nmap-aggressive',
            label: 'Aggressive Scan (-A)',
            description: "Enables OS detection, version detection, script scanning, and traceroute.",
            prefilled: { optional: [{ id: 1, name: 'aggressive', label: 'Aggressive Scan (-A)', type: 'checkbox', flag: '-A', value: true }] }
        }
    ]
  },
  // File Operations
  {
    id: "cat-file",
    category: "File Operations",
    label: "cat",
    description: "Display file contents.",
    template: "cat {{filename}}",
    docsUrl: "https://man.cx/cat",
    type: "command",
    keywords: ["cat", "file", "read", "display"],
    options: [
      { name: "filename", label: "Filename", type: "text", required: true },
      { name: "number_lines", label: "Number Lines (-n)", type: "checkbox", required: false, flag: "-n" },
    ],
    variants: []
  },
  {
    id: "find-files",
    category: "File Operations",
    label: "find",
    description: "Search for files and directories.",
    template: "find {{path}}",
    docsUrl: "https://man.cx/find",
    type: "command",
    keywords: ["find", "search", "files", "directories"],
    options: [
      { name: "path", label: "Path", type: "text", required: true },
      { name: "name_pattern", label: "Name Pattern", type: "text", required: false, flag: "-name" },
      { name: "iname_pattern", label: "Name Pattern (i-case)", type: "text", required: false, flag: "-iname" },
      { name: "type", label: "Type (f=file, d=dir)", type: "select", required: false, flag: "-type", choices: ["f", "d"] },
      { name: "permissions", label: "Permissions", type: "text", required: false, flag: "-perm" },
      { name: "exec_command", label: "Execute Command", type: "text", required: false, flag: "-exec" },
    ],
    variants: [
        {
            id: 'find-suid',
            label: 'Find SUID files',
            description: "Find files with SUID bit set.",
            prefilled: {
                required: { path: '/' },
                optional: [
                    { id: 1, name: 'permissions', label: 'Permissions', type: 'text', flag: '-perm', value: '-4000' },
                    { id: 2, name: 'exec_command', label: 'Execute Command', type: 'text', flag: '-exec', value: 'ls -ld {} \\;' }
                ]
            }
        },
        {
            id: 'find-php',
            label: 'Find PHP files',
            prefilled: {
                required: { path: '.' },
                optional: [{ id: 1, name: 'name_pattern', label: 'Name Pattern', type: 'text', flag: '-name', value: '*.php' }]
            }
        }
    ]
  },
  // System & General Utilities
  {
    id: "grep-modifier",
    category: "System & General Utilities",
    label: "Grep",
    description: "Filters input by searching for lines that match a given pattern.",
    type: "modifier",
    docsUrl: "https://man.cx/grep",
    template: "| grep {{pattern}}",
    allowMultiple: true,
    keywords: ["grep", "filter", "search", "pattern"],
    options: [
      { name: "pattern", label: "Pattern", type: "text", required: true, isRegex: true, description: "The pattern to search for in the output." },
      { name: "ignore_case", label: "Ignore Case (-i)", type: "checkbox", required: false, flag: "-i", description: "Perform case-insensitive matching." },
      { name: "invert_match", label: "Invert Match (-v)", type: "checkbox", required: false, flag: "-v", description: "Select non-matching lines." },
      { name: "line_number", label: "Line Number (-n)", type: "checkbox", required: false, flag: "-n", description: "Prefix each line with its line number." },
    ],
    variants: []
  },
  {
    id: "redirect-null",
    category: "System & General Utilities",
    label: "To /dev/null",
    description: "Redirect standard error to discard it.",
    type: "modifier",
    allowMultiple: false,
    docsUrl: "https://man.cx/null",
    template: "2>/dev/null",
    keywords: ["redirect", "null", "discard", "error"],
    options: [],
    variants: []
  }
];