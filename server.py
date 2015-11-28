from flask import Flask, request, jsonify
from savi import AuthAndLoad
import pdb
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
    print "In chain func"
    print request.form

    return jsonify({"status": True})

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)
