/**
 * @file CidrModal.tsx
 * @description A modal component that provides a CIDR (Classless Inter-Domain Routing) calculator.
 * It supports two modes: calculating network details from a single IP and prefix, or
 * calculating the smallest containing CIDR block from an IP range.
 */

import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

// Regular expression for validating an IPv4 address.
const IP_REGEX =
  /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const isValidIp = (ip: string) => IP_REGEX.test(ip);

/**
 * Converts an IPv4 address string to its 32-bit unsigned integer representation.
 * @param ip - The IPv4 address string (e.g., "192.168.1.1").
 * @returns The numeric representation of the IP.
 */
const ipToLong = (ip: string): number => {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
};

/**
 * Converts a 32-bit unsigned integer back to an IPv4 address string.
 * @param long - The numeric representation of the IP.
 * @returns The IPv4 address string.
 */
const longToIp = (long: number): string => {
  return (
    (long >>> 24) +
    "." +
    ((long >> 16) & 255) +
    "." +
    ((long >> 8) & 255) +
    "." +
    (long & 255)
  );
};

/**
 * Props for the CidrModal component.
 * @property isOpen - Whether the modal is currently visible.
 * @property onClose - Callback function to close the modal.
 * @property onApply - Callback function to apply the calculated CIDR value.
 * @property initialValue - An optional initial IP, CIDR, or range to populate the form.
 */
interface CidrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: string) => void;
  initialValue?: string;
}

/**
 * A modal dialog for calculating and analyzing CIDR blocks.
 */
export function CidrModal({
  isOpen,
  onClose,
  onApply,
  initialValue,
}: CidrModalProps) {
  /** State for the active calculator mode: 'single' IP or IP 'range'. */
  const [mode, setMode] = useState<"single" | "range">("single");

  // State for 'single' mode
  const [singleIp, setSingleIp] = useState("");
  const [prefix, setPrefix] = useState(32);

  // State for 'range' mode
  const [startIp, setStartIp] = useState("");
  const [endIp, setEndIp] = useState("");

  /** State to hold the calculated network result. */
  const [result, setResult] = useState<any>(null);
  /** State for any validation or calculation errors. */
  const [error, setError] = useState("");

  /**
   * A helper function to calculate and set network details from an IP and prefix.
   */
  const calculateAndSetResult = useCallback(
    (ipLong: number, calculatedPrefix: number) => {
      if (
        calculatedPrefix > 32 ||
        calculatedPrefix < 0 ||
        isNaN(calculatedPrefix)
      ) {
        setError(
          "Invalid prefix calculated. The IP range might be too large or invalid."
        );
        return;
      }

      const mask =
        calculatedPrefix === 0 ? 0 : (-1 << (32 - calculatedPrefix)) >>> 0;
      const networkLong = ipLong & mask;
      const broadcastLong = networkLong | (~mask >>> 0);

      const networkAddress = longToIp(networkLong);
      const broadcastAddress = longToIp(broadcastLong);

      let hosts: string, firstHost: string, lastHost: string;

      if (calculatedPrefix >= 31) {
        // Special handling for /31 (point-to-point) and /32 (single host) networks
        hosts = Math.pow(2, 32 - calculatedPrefix).toString();
        firstHost = networkAddress;
        lastHost = broadcastAddress;
      } else {
        const numHosts = Math.pow(2, 32 - calculatedPrefix) - 2;
        hosts = numHosts < 0 ? "0" : numHosts.toLocaleString();
        firstHost = longToIp(networkLong + 1);
        lastHost = longToIp(broadcastLong - 1);
      }

      setResult({
        cidr: `${networkAddress}/${calculatedPrefix}`,
        range: `${networkAddress} - ${broadcastAddress}`,
        network: networkAddress,
        firstHost,
        lastHost,
        broadcast: broadcastAddress,
        hosts,
      });
    },
    []
  );

  /**
   * Effect to initialize the modal's state when it is opened.
   * It parses the `initialValue` to pre-populate the fields and select the correct mode.
   */
  useEffect(() => {
    if (isOpen) {
      // Reset state on open to ensure a clean slate
      setResult(null);
      setError("");

      let initialMode: "single" | "range" = "single";
      let initialSingleIp = "";
      let initialPrefix = 32;
      let initialStartIp = "";
      let initialEndIp = "";

      // Parse the initial value to determine the mode and pre-fill inputs
      if (initialValue) {
        if (initialValue.includes("-")) {
          const parts = initialValue.split("-").map((s) => s.trim());
          if (
            parts.length === 2 &&
            isValidIp(parts[0]) &&
            isValidIp(parts[1])
          ) {
            initialMode = "range";
            initialStartIp = parts[0];
            initialEndIp = parts[1];
          }
        } else if (initialValue.includes("/")) {
          const parts = initialValue.split("/");
          if (isValidIp(parts[0])) {
            const parsedPrefix = parseInt(parts[1], 10);
            if (
              !isNaN(parsedPrefix) &&
              parsedPrefix >= 0 &&
              parsedPrefix <= 32
            ) {
              initialMode = "single";
              initialSingleIp = parts[0];
              initialPrefix = parsedPrefix;
            }
          }
        } else if (isValidIp(initialValue)) {
          initialMode = "single";
          initialSingleIp = initialValue;
        }
      }

      // Set the determined initial state
      setMode(initialMode);
      setSingleIp(initialSingleIp);
      setPrefix(initialPrefix);
      setStartIp(initialStartIp);
      setEndIp(initialEndIp);

      // Show results immediately if initialValue is set and valid
      setTimeout(() => {
        if (
          initialMode === "single" &&
          initialSingleIp &&
          isValidIp(initialSingleIp)
        ) {
          try {
            calculateAndSetResult(ipToLong(initialSingleIp), initialPrefix);
          } catch (e) {
            setError("Invalid IP address calculation.");
          }
        } else if (
          initialMode === "range" &&
          initialStartIp &&
          initialEndIp &&
          isValidIp(initialStartIp) &&
          isValidIp(initialEndIp)
        ) {
          try {
            let startLong = ipToLong(initialStartIp);
            let endLong = ipToLong(initialEndIp);

            if (startLong > endLong) {
              [startLong, endLong] = [endLong, startLong];
            }

            if (startLong === endLong) {
              calculateAndSetResult(startLong, 32);
              return;
            }

            const xor = startLong ^ endLong;
            const hostBits = 32 - Math.clz32(xor);
            const calculatedPrefix = 32 - hostBits;
            const networkMask = (-1 << hostBits) >>> 0;
            const networkLong = startLong & networkMask;

            calculateAndSetResult(networkLong, calculatedPrefix);
          } catch (e) {
            setError("Invalid IP range calculation.");
          }
        }
      }, 0);
    }
  }, [isOpen, initialValue, calculateAndSetResult]);

  /**
   * The core calculation effect. It runs whenever the inputs change and
   * calculates the network details for the current mode.
   */
  useEffect(() => {
    setError("");
    setResult(null);

    if (mode === "single") {
      if (!singleIp) return;
      if (!isValidIp(singleIp)) {
        setError("Please enter a valid IPv4 address.");
        return;
      }
      try {
        calculateAndSetResult(ipToLong(singleIp), prefix);
      } catch (e) {
        console.error(e);
        setError("Invalid IP address calculation.");
      }
    } else {
      // mode === 'range'
      if (!startIp || !endIp) return;
      if (!isValidIp(startIp) || !isValidIp(endIp)) {
        setError("Please enter valid start and end IPv4 addresses.");
        return;
      }

      try {
        let startLong = ipToLong(startIp);
        let endLong = ipToLong(endIp);

        // Ensure start IP is less than or equal to end IP
        if (startLong > endLong) {
          [startLong, endLong] = [endLong, startLong];
        }

        if (startLong === endLong) {
          // If the range is a single IP, it's a /32 network.
          calculateAndSetResult(startLong, 32);
          return;
        }

        // Find the smallest power of 2 that covers the difference between the IPs.
        // This is done by finding the most significant bit of the XOR of the two IPs.
        const xor = startLong ^ endLong;
        // Math.clz32 counts leading zeros for a 32-bit integer.
        // 32 - clz32(xor) gives us the number of bits required to represent the range,
        // which corresponds to the number of host bits in the subnet.
        const hostBits = 32 - Math.clz32(xor);
        const calculatedPrefix = 32 - hostBits;

        // Create a network mask for the calculated prefix.
        const networkMask = (-1 << hostBits) >>> 0;
        // Align the starting IP to the network boundary to find the network address.
        const networkLong = startLong & networkMask;

        calculateAndSetResult(networkLong, calculatedPrefix);
      } catch (e) {
        console.error(e);
        setError("Invalid IP range calculation.");
      }
    }
  }, [mode, singleIp, prefix, startIp, endIp, calculateAndSetResult]);

  /**
   * Handles the "Apply" button click. It invokes the `onApply` callback
   * with the calculated CIDR and closes the modal.
   */
  const handleApply = () => {
    if (result?.cidr && onApply) {
      onApply(result.cidr);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">CIDR Calculator</h3>
          <button
            onClick={onClose}
            className="p-1 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 active:bg-red-400 active:inset-shadow-sm dark:active:bg-red-500 transition dark:text-gray-400 dark:hover:text-white duration-500"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => setMode("single")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === "single"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Single IP
          </button>
          <button
            onClick={() => setMode("range")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === "range"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            IP Range
          </button>
        </div>

        <div className="space-y-4">
          {mode === "single" ? (
            <div className="flex flex-col gap-2">
              <div className="flex w-full items-center gap-2">
                <label
                  htmlFor="ip-input"
                  className="text-sm whitespace-nowrap mr-2"
                >
                  IP Address
                </label>
                <div className="flex items-center" style={{ gap: 0 }}>
                  {/* Dynamic width input: use a hidden span to measure width */}
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <input
                      id="ip-input"
                      type="text"
                      value={singleIp}
                      autoComplete="off"
                      onChange={(e) => setSingleIp(e.target.value)}
                      className={`pl-2 py-2 pr-0.5 border-2 border-r-0 focus:outline-none text-right border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 transition-all duration-300 ${
                        singleIp ? "border-solid" : "border-dashed"
                      }`}
                      placeholder=""
                      maxLength={15}
                      style={{
                        width: `calc(${singleIp.length || 12}ch)`,
                        minWidth: "8ch",
                        maxWidth: "18ch",
                        borderTopLeftRadius: "0.5rem",
                        borderBottomLeftRadius: "0.5rem",
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                        transition: "width 0.2s",
                      }}
                    />
                  </div>
                  {/* Trailing select */}
                  <div className="relative">
                    <select
                      id="prefix-select"
                      value={prefix}
                      onChange={(e) => setPrefix(parseInt(e.target.value, 10))}
                      className="peer appearance-none block w-15 pr-3 py-2 border-2 border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
                    >
                      {Array.from({ length: 33 }, (_, i) => 32 - i).map((p) => (
                        <option key={p} value={p}>
                          /{p}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center w-full">
              <label
                htmlFor="start-ip-input"
                className="text-sm whitespace-nowrap mr-2"
                style={{ minWidth: "70px" }}
              >
                IP Range
              </label>
              <div className="flex flex-1 items-center h-full">
                <input
                  id="start-ip-input"
                  type="text"
                  value={startIp}
                  onChange={(e) => setStartIp(e.target.value)}
                  className={`p-2 h-11 w-full border-2 border-r-0 rounded-l-lg focus:outline-none border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 transition-all duration-300 flex-1 text-right ${
                    startIp ? "border-solid" : "border-dashed"
                  }`}
                  placeholder="e.g., 192.168.1.1"
                />
                <span className="flex items-center justify-center h-11 text-center text-lg text-gray-500 dark:text-gray-400 select-none border-y-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
                  -
                </span>
                <input
                  id="end-ip-input"
                  type="text"
                  value={endIp}
                  onChange={(e) => setEndIp(e.target.value)}
                  className={`p-2 w-full border-2 border-l-0 rounded-r-lg focus:outline-none border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 transition-all duration-300 flex-1 ${
                    endIp ? "border-solid" : "border-dashed"
                  }`}
                  placeholder="e.g., 192.168.1.10"
                />
              </div>
            </div>
          )}

          {/* Results Display */}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {result && !error && (
            <div>
              <h4 className="font-semibold mb-2 mt-4">Result:</h4>
              <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg font-mono text-sm space-y-1">
                {result.hosts && (
                  <div>
                    <strong>Total Hosts:</strong> {result.hosts}
                  </div>
                )}
                {result.cidr && (
                  <div>
                    <strong>CIDR:</strong> {result.cidr}
                  </div>
                )}
                {result.network && (
                  <div>
                    <strong>Network:</strong> {result.network}
                  </div>
                )}
                {result.broadcast && (
                  <div>
                    <strong>Broadcast:</strong> {result.broadcast}
                  </div>
                )}
                {result.range && (
                  <div>
                    <strong>Range:</strong> {result.range}
                  </div>
                )}
                {result.firstHost && (
                  <div>
                    <strong>Usable Range:</strong> {result.firstHost} -{" "}
                    {result.lastHost}
                  </div>
                )}
              </div>
              <button
                onClick={handleApply}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300 mt-4"
                disabled={!result || !result.cidr}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
