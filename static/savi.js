//Need these to be global; otherwise won't work
//create graph
var graph_div = $("#graph");
    var width = graph_div.width()
    graph_div.append(
        '<svg height="500" id="svg" width="' + graph_div.width() + '"></svg>'
    )

var graph = new myGraph("#graph");
var SERVER_ADDR = "http://localhost:5000/";
$(function(){
    
    
    
    var username = $("#username");
    var password = $("#password");
    var region_select = $("#region-select");
    var tenant_select = $("#tenant-select");

    var tenant_select = function(disable, tenants, current_tenant){
        //enable tenant select and add options 
        //to tenant select 
        //Arguments:
        //enable -> bool
        //tenants -> list of available tenants
        //current_tenant -> str 
        var tenant_select = $("#tenant-select");

        tenant_select.attr('disabled', disable);
        if(!disable){
            _.map(tenants, function(tenant){
                tenant_select.append(
                    //Append tenant options to select
                    '<option value="'+tenant+'">'+tenant+'</option>');
            })
            //Set the default 
            tenant_select.val(current_tenant);
        }
    }

    //authenticates the user
    var authenticate = function(login_params){
     
        $.ajax({
            url: SERVER_ADDR + "auth", 
            data: login_params, 
            method: "POST",
            success: function(resp){
                console.log(resp);
                if(resp.status){
                    tenant_select(false, resp.tenants, resp.default_tenant);
                    _.map(resp.servers, function(server){
                        var details = {
                                name: server.name,
                                id: server.id,
                                addr: server.addr                                
                            }           
                        graph.addNode(server.name + "(" + server.addr + ")", details);
                     })
                }else{
                    //Not authenticated
                    $('#tenant-name').attr('disabled', true);
                }
            }
        })
    }
    
    //Change either the tenant or region
    var change_param = function(dict){
        param = Object.keys(dict)[0]
        value = dict[param]
        console.log("Changing " + param + " to " + value);

        $.ajax({
            url: SERVER_ADDR + "change_param", 
            data: dict,
            method: "POST",
            success: function(resp){
                console.log(resp);
                if(resp.status){
                    //Delete existing servers
                    graph.removeAll();
                    //tenant_select(false, resp.tenants, resp.default_tenant);
                    _.map(resp.servers, function(server){
                        graph.addNode(server.name + "(" + server.addr + ")" );
                     })
                }else{
                    //Not authenticated
                    $('#tenant-name').attr('disabled', true);
                }
            }
        })

    }

    //Region Changed
    region_select.change(function(){
        change_param({"region_name":region_select.val()});
    });
    
    //Tenant changed
    $("#tenant-select").change(function(){
        var tenant_val = $("#tenant-select").val();
        change_param({"tenant_name":tenant_val});
    });

    var create_alert = function(field){
        var alert_html =
            '<div class="alert alert-danger alert-dismissible" role="alert">'+
                '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>'+
                '<strong>Warning!</strong>' + ' Enter/choose a valid value for ' + field + ' '
            '</div>'
        $("nav").first().after(alert_html);
    }

    $("#login").click(function(){
            
            //Do client side checking here
            if(!username.val()) create_alert("Username");            
            else if(!password.val()) create_alert("Password");            
            else if(!region_select.val()) create_alert("Region Name");            
            else{
                var login_params = {
                    "username": username.val(),
                    "password": password.val(),
                    "region_name":region_select.val()
                }
    
                authenticate(login_params);
            }            
        }
    )
    
    //gateway checkbox
    $("#gateway").change(function(){
        var checked = $("#gateway").prop("checked")
        if (checked) {
            //Add anchor node
            graph.addAnchorNode("Gateway");
        }else{
            //remove anchor node
            graph.removeNode("Gateway");
        }
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
