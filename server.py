from flask import Flask, request, jsonify
from savi import AuthAndLoad
import pdb
import json
from aws import AwsClient
from chaining import create_chain
from ip_client import get_node_ip

app = Flask(__name__, static_url_path='')
auth_load = AuthAndLoad()

@app.route("/")
def hello():
    return app.send_static_file('index.html')

@app.route("/auth", methods=['POST'])
def auth():
    try:
        auth_load.auth(request.values['username'], 
                       request.values['password'],
                       request.values['region_name'])
        auth_load.get_tenants()
        auth_load.tenant_auth()
        auth_load.get_servers()
        
        response = {
            'status': True,
            'tenants': auth_load.tenants,
            'servers': auth_load.servers,
            'default_tenant': auth_load.default_tenant
        }
    except ValueError as err:
        response = {
            'status': False,
            'status_code': auth_load.resp.status_code,
            'status_text': auth_load.resp.text
        }
    finally:
        return jsonify(response)


@app.route("/auth_aws", methods=['POST'])
def auth_aws():
    try:
        aws_client = AwsClient(aws_access_key_id=request.values['key_id'], 
                               aws_secret_access_key=request.values['secret_key'],
                               region=request.values["region_name"])
        response = {
            'status': True,
            'servers': aws_client.list_running_servers()
        }
    except ValueError as err:
        print err
        response = {
            'status': False,
        }
    finally:
        return jsonify(response)

@app.route("/change_param", methods=['POST'])
def change_param():
    """
    Either region_name or tenant_name changed
    """
    response = {}
    if "tenant_name" in request.values:
        try:
            auth_load.tenant_auth(tenant_name=request.values['tenant_name'])
            auth_load.get_servers()
            response = {
                'status': True,
                'tenants': auth_load.tenants,
                'servers': auth_load.servers,
                'default_tenant': auth_load.default_tenant
            }
        except ValueError as err:
            response = {
                'status': False,
                'status_code': auth_load.resp.status_code,
                'status_text': auth_load.resp.text
            }
    elif "region_name" in request.values:
        try:
            auth_load.change_region(request.values['region_name'])
            auth_load.get_servers()
            response = {
                'status': True,
                'tenants': auth_load.tenants,
                'servers': auth_load.servers,
                'default_tenant': auth_load.default_tenant
            }
        except ValueError as err:
            response = {
                'status': False,
                'status_code': auth_load.resp.status_code,
                'status_text': auth_load.resp.text
            }

    return jsonify(response)

@app.route("/chain", methods=['POST'])
def chain():
    """
    Chain the servers
    call the chaining script
    """
    chain_data = json.loads(request.values["chain_data"])
    ep1 = chain_data["chain"]["ep1"]["addr"]
    ep2 = chain_data["chain"]["ep2"]["addr"]
    middlebox = chain_data["chain"]["middlebox"]["addr"]
    master_ip = chain_data["master_ip"]

    print "received inputs ep1={} ep2={} middlebox={} master_ip={}".format(ep1, ep2, middlebox, master_ip)

    ep1 = get_node_ip(addr=ep1)
    ep2 = get_node_ip(addr=ep2)
    middlebox = get_node_ip(addr=middlebox)
    
    print "Overlay IPs are: ep1={} ep2={} middlebox={} master_ip={}".format(ep1, ep2, middlebox)

    #Thomas' script here
    create_chain(ep1=ep1, ep2=ep2, middlebox=middlebox, janus_ip=master_ip, flowname=auth_load.user_id + "-chain")

    return jsonify({"status": True})

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)
