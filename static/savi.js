//CONSTANTS
var SERVER_ADDR = "/";

//Need these to be global; otherwise won't work
//create graph
var graph_div = $("#graph");
    var width = graph_div.width()
    graph_div.append(
        '<svg height="500" id="svg" width="' + graph_div.width() + '"></svg>'
    )

//The graph object
var graph = new myGraph("#graph");
var is_logged_in = false; //SAVI 

$(function(){
    
    /******************** Fields ***********************/
    //Savi fields
    var username = $("#username");
    var password = $("#password");
    var regions = $("#region-select");
    var tenants = $("#tenant-select");
    
    //Aws fields
    var key_id = $("#access-key-id");
    var sec_key = $("#secret-access-key");
    var regions_aws = $("#region-select-aws");

    /******************** Helper Functions ***********************/

    var tenant_select = function(disable, tenant_list, current_tenant){
        /*enables/disables tenant select input and add tenant options*/
        //Arguments:
        //enable -> bool
        //tenant_list -> list of available tenants
        //current_tenant -> str 

        tenants.attr('disabled', disable);
        if(!disable){
            _.map(tenant_list, function(tenant){
                tenants.append(
                    //Append tenant options to select
                    '<option value="'+tenant+'">'+tenant+'</option>');
            })
            //Set the default 
            tenants.val(current_tenant);
        }
    }

    var authenticate = function(login_params, success_callback){
        /*authenticates the user*/
        $.ajax({
            url: SERVER_ADDR + "auth", 
            data: login_params, 
            method: "POST",
            success: function(resp){
                is_logged_in = true;
                if(success_callback) success_callback();
                console.log(resp);
                if(resp.status){
                    tenant_select(false, resp.tenants, resp.default_tenant);
                    _.map(resp.servers, function(server){
                        var details = {
                                name: server.name,
                                id: server.id,
                                addr: server.faddr || server.addr,
                                type: 'savi'
                            }           
                        graph.addNode(details.name + "(" + details.addr + ")", details);
                     })
                }else{
                    //Not authenticated
                    $('#tenant-name').attr('disabled', true);
                    create_alert("Username and/or Password");
                }
            }
        })
    }

    var authenticate_aws = function(login_params, success_callback){
        /*authenticates the user against AWS*/
        $.ajax({
            url: SERVER_ADDR + "auth_aws", 
            data: login_params, 
            method: "POST",
            success: function(resp){
                if(success_callback) success_callback();
                console.log(resp);
                if(resp.status){
                       for(var i=0, coll =resp.servers[i]; i<resp.servers.length; i++)
                           for(var j=0; j < coll.Instances.length; j++){
                            var inst = coll.Instances[j];
                            var details = {
                                    name: inst.InstanceId,
                                    id: inst.InstanceId,
                                    addr: inst.PublicIpAddress,
                                    type: 'aws'
                                }
                            graph.addNode(inst.InstanceId + "(" + inst.PublicIpAddress + ")", details);
                        }
                }else{
                    //Not authenticated
                    $('#tenant-name').attr('disabled', true);
                    create_alert("Access Key ID and/or Secret Access Key");
                }
            }
        })
    }
    
    var change_param = function(dict, success_callback){
        /*Change either the tenant or region*/
        param = Object.keys(dict)[0]
        value = dict[param]
        console.log("Changing " + param + " to " + value);

        $.ajax({
            url: SERVER_ADDR + "change_param", 
            data: dict,
            method: "POST",
            success: function(resp){
                if(success_callback) success_callback();
                console.log(resp);
                if(resp.status){
                    //Delete existing servers
                    //graph.removeAll();
                    graph.removeAllSavi();

                    _.map(resp.servers, function(server){
                        console.log(server);
                        var details = {
                                name: server.name,
                                id: server.id,
                                addr: server.faddr || server.addr,
                                type: 'savi'
                            }           
                        graph.addNode(details.name + "(" + details.addr + ")", details);
                     })
                }else{
                    //Not authenticated
                    $('#tenant-name').attr('disabled', true);
                }
            }
        })
    }

    var create_alert = function(field){
        /*Creates an alert*/
        var alert_html =
            '<div class="alert alert-danger alert-dismissible" role="alert">'+
                '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>'+
                '<strong>Warning!</strong>' + ' Enter/choose a valid value for ' + field + ' '
            '</div>'
        $("nav").first().after(alert_html);
    }

    /******************** SAVI Events ***********************/
    regions.change(function(){
        /*Region Changed*/
        if(!is_logged_in) return;

        $("body").append('<div id="overlay-loader" class="loading-overlay"></div>')
        success_callback = function(){
            //remove overlay 
            $("#overlay-loader").remove();
        }

        change_param({"region_name":regions.val()}, success_callback);
    });
    
    tenants.change(function(){
        /*Tenant changed*/
        if(!is_logged_in) return;
        $("body").append('<div id="overlay-loader" class="loading-overlay"></div>')
        
        success_callback = function(){
            $("#overlay-loader").remove();
        }
        var tenant_val = $("#tenant-select").val();
        change_param({"tenant_name":tenant_val}, success_callback);
    });

    //Savi login
    $("#login").click(function(){
            //client side checking
            if(!username.val()){ create_alert("Username"); return; };            
            if(!password.val()){create_alert("Password"); return; };            
            if(!regions.val()){create_alert("Region"); return;}

            $("body").append('<div id="overlay-loader" class="loading-overlay"></div>')
            
            success_callback = function(){
                $("#overlay-loader").remove();
            }
            authenticate({ username : username.val(), 
                           password : password.val(), 
                           region_name: regions.val()}, success_callback);
        }
    )

    /******************** AWS Events ***********************/
    //AWS login
    $("#login-aws").click(function(){
            //client side checking
            if(!key_id.val()){ create_alert("Access Key ID"); return; }
            if(!sec_key.val()){create_alert("Secret Access Key"); return; }         
            if(!regions_aws.val()){create_alert("Region"); return; }

            $("body").append('<div id="overlay-loader" class="loading-overlay"></div>')
            
            success_callback = function(){
                $("#overlay-loader").remove();
            }
            authenticate_aws({ key_id: key_id.val() , 
                               secret_key: sec_key.val(), 
                               region_name: regions_aws.val()}, success_callback);
        }
    )

    /******************** Chaining Events ***********************/
    //TODO: remove one of the following 2 functions
    $("#apply-chaining").click(function(){
        console.log("Apply chaining clicked")
        var master_ip = $("#master_ip").val()
        //console.log(graph);
        //console.log(graph.getGraph());
        console.log(graph.getChain());
        console.log(master_ip);

        req_data = {"chain_data": JSON.stringify({
                'master_ip': master_ip,
                'chain': graph.getChain()
            })}

        console.log(req_data)
            return

        $.ajax({
            url: SERVER_ADDR + "chain", 
            data: req_data,
            method: "POST",
            success: function(resp){
                console.log(resp);
                if(resp.status){
                
                }else{
                    //Not authenticated
                    $('#tenant-name').attr('disabled', true);
                }
            }
        })

    })
    
    $("#chain").click(function(){
        //Get the IP addrs
        var connections = [];        
        _.map(graph.getConnections(), function(link){
            connections.push([link.source.details.addr,
                              link.target.details.addr
            ])
        })
        
        console.log(connections);
        $.ajax({
            url: SERVER_ADDR + "chain", 
            data: {"connections": connections},
            method: "POST",
            success: function(resp){
                console.log("received response: ", resp);
                
            }
        })
    })
    
    
})
