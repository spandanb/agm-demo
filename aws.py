"""
https://github.com/boto/boto3#quick-start

Security credentials:
http://docs.aws.amazon.com/general/latest/gr/managing-aws-access-keys.html

Documentation
https://boto3.readthedocs.org/en/latest/
http://boto3.readthedocs.org/en/latest/reference/services/ec2.html#EC2.Client.run_instances

Gotcha's:
Make sure the security group allows SSH connectivity 
"""

import boto3
import pdb
import os
#import paramiko
from socket import error as socket_error

#Image id's for same image vary by location
#Ubuntu 14.04
ubuntu = {
    'us-east-1':'ami-fce3c696', #N. Virginia
    'us-west-1':'ami-06116566', #N. California
    'us-west-2':'ami-9abea4fb', #Oregon
}


class AwsClient(object):
    """
    A class for a AWS Client
    """
    def __init__(self, aws_access_key_id="", aws_secret_access_key="", region=""):
        """
        Initializes the AWS client. Parameters can be either passed
        in or set through env vars.
        """
        self.aws_access_key_id = aws_access_key_id or os.environ["AWS_ACCESS_KEY_ID"]
        self.aws_secret_access_key = aws_secret_access_key or os.environ["AWS_SECRET_ACCESS_KEY"]
        self.set_region(region or os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
        
        self.ec2_client = self._get_client('ec2')

    def _get_client(self, service):
        """
        Gets a client for the given service
        Arguments:-
            service:- name of service, eg. 'ec2', 's3'
        """
        #Check if the environment vars are set
        #See http://boto3.readthedocs.org/en/latest/guide/configuration.html
        #for setting credential vars
        #See http://russell.ballestrini.net/setting-region-programmatically-in-boto3/
        #for setting region
        
        return boto3.client(service, 
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            region_name=self.aws_region
        )

    def set_region(self, region):
        """
        Sets the default region
        """
        self.aws_region = region 

    def check_keyname(self, keyname):
        """
        Checks whether keyname exists
        """
        resp = self.ec2_client.describe_key_pairs()
        return next((True for keypair in resp["KeyPairs"] 
                    if keypair["KeyName"] == keyname), False)

    def check_keyfingerprint(self, keyname, fingerprint):
        """
        Checks whether fingerprint matches local key.
        """
        resp = self.ec2_client.describe_key_pairs()
        return next((True for keypair in resp["KeyPairs"] 
                    if keypair["KeyName"] == keyname and keypair["KeyFingerprint"] == fingerprint), False)

    def create_keypair(self, keyname, pubkey):
        """
        create a keypair with the given name
        """
        self.ec2_client.import_key_pair(
            KeyName = keyname,
            PublicKeyMaterial = pubkey
        )

    def get_keyname(self, fingerprint):
        """
        Get keyname with matching fingerprint or None
        """
        resp = self.ec2_client.describe_key_pairs()
        return next((keypair["KeyName"] for keypair in resp["KeyPairs"] 
                    if keypair["KeyFingerprint"] == fingerprint), None)

    def remove_keypair(self, keyname):
        """
        Deletes a keypair
        """
        self.ec2_client.delete_key_pair(KeyName=keyname)

    def list_images(self):
        """
        Returns a list of images. 
        Very slow operation (~15s) since AWS has 50K > images
        """
        resp = self.ec2_client.describe_images()
        return resp 

    def list_security_groups(self):
        resp = self.ec2_client.describe_security_groups()
        return resp['SecurityGroups']

    def create_server(self, image, flavor, keyname='', user_data=''):
        """
        Creates a server 
        """
        resp = self.ec2_client.run_instances(
                ImageId=image,
                InstanceType=flavor,
                MinCount=1,
                MaxCount=1,
                KeyName = keyname,
                UserData = user_data,
                )

        return [instance["InstanceId"] for instance in resp["Instances"]]

    def list_servers(self):
        resp = self.ec2_client.describe_instances()
        return resp['Reservations'] 

    def list_running_servers(self, instance_ids=[]):
        """
        Returns instances matching instance_ids, where
        the status is 'running'
        """
        if instance_ids:
            resp = self.ec2_client.describe_instances(
                InstanceIds=instance_ids, 
                Filters=[
                    {
                        'Name': 'instance-state-name',
                        'Values': ['running'],
                    }
                ]
            )
        else:
            resp = self.ec2_client.describe_instances(
                Filters=[
                    {
                        'Name': 'instance-state-name',
                        'Values': ['running'],
                    }
                ]
            )
        return resp['Reservations']

    def delete_all(self):
        """
        Delete all servers in running or pending state
        """
        servers = self.list_servers() 
        server_ids = [ instance['InstanceId'] for group in servers
                            for instance in group["Instances"] 
                                if instance['State']['Name'] == 'pending' 
                                    or instance['State']['Name'] == 'running'
                                ]
        print "Deleting {}".format(server_ids)
        if server_ids:
            self.ec2_client.terminate_instances(InstanceIds=server_ids)

if __name__ == "__main__":
    DEFAULT_KEYNAME="spandan_key"

    ac = AwsClient()
    #region is set through env var, but explicitly set it again
    region = 'us-east-1'
    ac.set_region(region)

    #Now create a server 
    #instance_ids = ac.create_server(ubuntu[region], "t2.nano", keyname=DEFAULT_KEYNAME)
    #print get_server_ips(ac, instance_ids)

    #List the servers
    print ac.list_servers()
    #ac.delete_all()
    
    #ac.list_security_groups()
