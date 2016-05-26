import socket

def get_node_ip(addr="127.0.0.1", port=5000):
    """
    Connects a socket to server at `addr` and port `port`
    Returns the received IP
    """
    soc = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    soc.connect((addr, port))
    soc.send(' ')
    data = soc.recv(128)
    soc.close()
    return data



if __name__ == "__main__":
    get_node_ip()
