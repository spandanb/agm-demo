
function myGraph(el) {
    /*
    Prototype for d3 graph object
    */

    // Add and remove elements on the graph object
    //NOTE: This is deprecated
    this.addNode2 = function (id, type) {

        type = type || "server"; 
        //Need a suitable id
        if(!id){
           //Find number of existing nodes
           //The id is the type + count
           var counts =  _.countBy(nodes, function(node){ return node.type});
           id = type + (counts[type] ? counts[type] : '0');
        }
        nodes.push({"id": id, "type": type});
        update();
    }

    this.addNode = function(id, details){
        //details is a dict of additional node properties
        //type -> type of param [server | database | vnf] 
        //Set defaults if values not specified

        console.log(id, details);

        if (!id) {
            id = "Server" + nodes.length
        }
        nodes.push({id: id, details: details})
        update();        

    }
    
    this.removeNode = function (id) {
        var i = 0;
        var n = findNode(id);
        while (i < links.length) {
            if ((links[i]['source'] === n)||(links[i]['target'] == n)) links.splice(i,1);
            else i++;
        }
        var index = findNodeIndex(id);
        if(index !== undefined) {
            nodes.splice(index, 1);
            update();
        }
    }

    this.removeAll = function(){
        //Clears all nodes and links
        links.splice(0, links.length);
        nodes.splice(0, nodes.length);
        update();
    }

    this.removeAllSavi = function(){
        /*Remove all Savi nodes*/
        for(var i=0; i<nodes.length; ){
            if(nodes[i].details.type == "savi")
                nodes.splice(i,1);
            else //inc only if head not removed 
                i++;
        }
        update();    
    }

    this.addLink = function (sourceId, targetId) {
        var sourceNode = findNode(sourceId);
        var targetNode = findNode(targetId);

        if((sourceNode !== undefined) && (targetNode !== undefined)) {
            links.push({"source": sourceNode, "target": targetNode});
            update();
        }
    }

    this.addLinkFromNode = function(source, target){
        //source -> source node obj
        //target -> destination node obj
        links.push({"source": source, "target": target});
        update();
    
    }

    this.addAnchorNode = function (anchorId){
        //A special node like the gateway
        //that is fixed and connected to everyone else
        nodes.push({"id": anchorId, "fixed":true, "r": 32});
            
        //Add links to all nodes 
        _.map(nodes, function(node){
            var anchorNode = findNode(anchorId);
            if(node.id != anchorId){
               links.push({"source":anchorNode, "target":node,
                          "lineStyle":"link-dashed"}); //This makes it wonky
            }    
        })
        //Add links 
        update();
    }
    
    this.getConnections = function(){
        //returns a list of connections
        return _.map(links, function(link){
                return {source: link.source, target: link.target}
            })        
    }
    
    
    this.linkState = {source: null, target: null, srcWrite:true};

    var findNode = function (id) {
        for (var i=0; i < nodes.length; i++) {
            if (nodes[i].id === id)
                return nodes[i]
        };
    }

    var findNodeIndex = function (id) {
        for (var i=0; i < nodes.length; i++) {
            if (nodes[i].id === id)
                return i
        };
    }

    this.getGraph = function(){
        /* returns a dict representation of the graph*/
        return {'nodes': nodes, 'links' : links}
    }

    this.getChain = function(){
        /*Inspects all links; if a node is connected to 
        two other nodes, then this is a chain*/
        
        var get_id = function(node){return node.details.id}
        var get_details = function(node){return node.details}

        if(links.length == 2){
           if(get_id(links[0].source) == get_id(links[1].source)){
               chain = {
                    'ep1': links[0].target,
                    'ep2': links[1].target,
                    'middlebox': links[0].source
               }
           }else if(get_id(links[0].source) == get_id(links[1].target)){
               chain = {
                    'ep1': links[0].target,
                    'ep2': links[1].source,
                    'middlebox': links[0].source
               }
           }else if(get_id(links[0].target) == get_id(links[1].source)){
               chain = {
                    'ep1': links[0].source,
                    'ep2': links[1].target,
                    'middlebox': links[0].target
               }
           
           }else{
            alert("Error: To create a chain, only connect 2 nodes to a middlebox")
           }
        }else{
            alert("Error: To create a chain, only connect 3 nodes")
        }

        return {
                    ep1: get_details(chain.ep1), 
                    ep2: get_details(chain.ep2), 
                    middlebox: get_details(chain.middlebox)
               }
    }

    // set up the D3 visualisation in the specified element
    var vis = this.vis = d3.select("svg");

    var force = d3.layout.force()
        //.gravity(.05)
        .distance(100)
        .charge(-120)
        //.linkDistance(200)
        .size(["500", "500"]); //The width, height of svg canvas

    //Need this so links appear under nodes    
    vis.append("g").attr("id", "links")
    vis.append("g").attr("id", "nodes")    
        
    var links = force.links();    
    var nodes = force.nodes();
        
        
    //This update works with the server images    
    var update = function () {

        var link = vis.select("#links").selectAll(".link")
            .data(links, function(d) { return d.source.id + "-" + d.target.id; })
            
        link.enter().append("line")
            .attr("class", function(d){ return "link" })
            .style("marker-end", "url(#suit)")

        link.exit().remove();

        var node = vis.selectAll("g.node")
            .data(nodes, function(d) { return d.id;})
            .classed('gnode', true)

        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .on('click', function(n){
                    if(graph.linkState.srcWrite){
                        graph.linkState.source = n;
                        graph.linkState.srcWrite = false;
                    }else{
                        graph.linkState.target = n;
                        graph.linkState.srcWrite = true;
                        graph.addLinkFromNode(graph.linkState.source, graph.linkState.target);
                    }
                })
            .call(force.drag)
            

        //Show server icons
        /*
        nodeEnter.append("image")
            .attr("class", "circle")
            .attr("xlink:href", function(d){ return "icons/" + (d.type || "server") + ".png"})
            .attr("x", "-8px")
            .attr("y", "-8px")
            .attr("width", "64px")
            .attr("height", "64px");        
        */
        
        //Show circles
        nodeEnter.append("circle")
            .attr("class", "node-inner")
            .attr("r", function(d){return d.r || 8})
            .style("fill", function(d){return !!d.fixed? "#ff6666":"#cccccc"})
        
        nodeEnter.append("text")
            .attr("class", "nodetext")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(function(d) {return d.id});

        node.exit().remove();

        force.on("tick", function() {
          link.attr("x1", function(d) { return d.source.x; })
              .attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; });

          node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        });

        // Restart the force layout.
        force.start();
    }
    

    // Make it all go
    update();
}
