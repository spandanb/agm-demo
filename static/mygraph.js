
function myGraph(el) {
    /*
    Prototype for d3 graph object
    */

    // Add and remove elements on the graph object
    this.addNode = function (id, type) {
        //Set defaults if values not specified
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
        links.splice(0, links.length);
        nodes.splice(0, nodes.length);
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
        links.push({"source": source, "target": target});
        update();
    
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

    // set up the D3 visualisation in the specified element
    var vis = this.vis = d3.select("svg");

    var force = d3.layout.force()
        .gravity(.05)
        .distance(100)
        .charge(-100)
        .size(["500", "500"]); //The width, height of svg canvas

    var nodes = force.nodes(),
        links = force.links();

    var update = function () {

        var link = vis.selectAll("line.link")
            .data(links, function(d) { return d.source.id + "-" + d.target.id; });

        link.enter().insert("line")
            .attr("class", "link");

        link.exit().remove();

        var node = vis.selectAll("g.node")
            .data(nodes, function(d) { return d.id;});

        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .call(force.drag)
            .on('click', function(n){
                    if(graph.linkState.srcWrite){
                        graph.linkState.source = n;
                        graph.linkState.srcWrite = false;
                    }else{
                        graph.linkState.target = n;
                        graph.linkState.srcWrite = true;
                        graph.addLinkFromNode(graph.linkState.source, graph.linkState.target);
                    }
                });

        nodeEnter.append("image")
            .attr("class", "circle")
            .attr("xlink:href", function(d){ return "icons/" + d.type + ".png"})
            .attr("x", "-8px")
            .attr("y", "-8px")
            .attr("width", "64px")
            .attr("height", "64px");

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
