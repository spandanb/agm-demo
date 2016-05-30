import requests
import json 
from  pdb import set_trace 

class AuthAndLoad(object):
    """
    Authenticates user and loads
    servers' info
    Typical usage:
    auth()
    get_tenants()
    tenant_auth()
    get_servers()
    """
    def __init__(self):
        pass


    def _get_url(self, suffix):
        """
        Return URL for a specific call
        """
        KEYSTONE_URL = "http://iam.savitestbed.ca:5000/v2.0/"
        return KEYSTONE_URL + suffix


    def _get_server_details(self, servers):
        """
        Take a list of servers and extract 
        name and addr
        """
        """
        curl -H "X-Auth-Token: <token>" <public_url>/<tenant id>/<api path>
        """

        def extract_server_details(server):
            """
            helper
            """
            #Get first network addresses
            addr_name, addr_list = server["addresses"].popitem()
            #a list- perhaps to account for multiple interfaces in a network
            if len(addr_list) == 1:
                return {
                    "addr" : addr_list[0]["addr"],
                    "id" : server["id"],
                    "name" : server["name"]
                }
            else:
                #NOTE: It may be possible to have multiple ext addr; this solution would then fail
                if addr_list[0]['OS-EXT-IPS:type'] == "fixed":
                    ip  = addr_list[0]['addr']
                    fip = addr_list[1]['addr']
                else:
                    ip  = addr_list[1]['addr']
                    fip = addr_list[0]['addr']

                return {
                    "addr" : ip,
                    "faddr": fip,
                    "id" : server["id"],
                    "name" : server["name"]
                }

        #TODO: allow them to specify showing all servers?
        #return map(extract_server_details, servers)
        return map(extract_server_details,
                filter(lambda s: s['user_id'] == self.user_id, servers))
              


    def _get_nova_url(self, service_catalog):
        novas = filter(lambda service: service['name'] == 'nova', 
            service_catalog) 

        nova = filter(lambda endpoint: endpoint['region'] == self.region_name, 
            novas[0]['endpoints'])

        public_url = nova[0]['publicURL']
        return public_url

    def _get_token(self, access):
        return access['token']['id']

    def auth(self, username, password, region_name):
        """
        authenticate the user; returns True if successful, False otherwise
        """
        """
        curl -d '{"auth":{"passwordCredentials":{"username": username, 
            "password": password},"tenantName": tenant}}' 
            -H "Content-Type: application/json" 
            http://iam.savitestbed.ca:5000/v2.0/tokens
        """

        self.region_name = region_name
        data = {
            "auth":{
                "passwordCredentials": {
                    "username":username,
                    "password":password
                },
            }
        }

        headers = {"Content-Type": "application/json"}
        
        resp = requests.post(self._get_url("tokens"), data=json.dumps(data), 
            headers=headers )
        if resp.status_code > 204:
            self.resp = resp
            raise ValueError("Server returned non-200 status")
        
        self.access = resp.json()['access']
        self.token = self._get_token(self.access)
        self.user_id = self.access['user']['id']
        return True

    def tenant_auth(self, tenant_name=None):
        """
        Auth with the specific tenant
        """
        if not tenant_name:
            tenant_name = self.tenants[0]

        self.default_tenant = tenant_name
        
        data = {
            "auth":{
                "token": {
                    "id": self.token
                },
                "tenantName": tenant_name
            }
        }
        headers = {"Content-Type": "application/json"}
        resp = requests.post(self._get_url("tokens"), data=json.dumps(data), 
            headers=headers )
        if resp.status_code > 204:
            self.resp = resp
            raise ValueError("Server returned non-200 status")
        
        self.access = resp.json()['access']
        self.tenant_token = self._get_token(self.access)
        #print "In tenant_auth; token is {}".format(self.tenant_token)
        return True

    def get_tenants(self):
        """
        gets the available tenants for this token
        """
        headers = {
                "X-Auth-Token": self.token
            }    
        resp = requests.get(self._get_url("tenants"),
            headers=headers)
        tenant_dicts = resp.json()['tenants']
        #Extract the names
        tenants = [tenant_dict['name'] for tenant_dict in tenant_dicts ]
        self.tenants = tenants
        return tenants 

    def change_region(self, region_name):
        self.region_name = region_name

    def get_servers(self, token=None, nova_url=None):
        """
        Gets the information about the servers
        """
        if not token:
            token = self.tenant_token
        if not nova_url: 
            nova_url = self._get_nova_url(self.access['serviceCatalog'])
        
        #print "token is {}; url is {}".format(token, nova_url)
        api_url = nova_url + "/servers/detail" 
        headers = {"X-Auth-Token" : token}
        resp = requests.get(api_url, headers=headers)

        if resp.status_code > 204:
            self.resp = resp
            raise ValueError("Server returned non-200 status")

        servers = resp.json()['servers']
        self.servers = self._get_server_details(servers)
        return self.servers


