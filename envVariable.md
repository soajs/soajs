
Please set the below env variables:

# REGISTRY:
=============

#### The path from the root level to where the profile file is
SOAJS_PROFILE = /opt/soajs/profiles/single.js

#### The environment to load
SOAJS_ENV = "dev"

#### the container cluster technology
SOAJS_DEPLOY_HA = "kubernetes"

#### To automatically register a service with the gateway
SOAJS_SRV_AUTOREGISTERHOST = true

#### to run a service as standalone
SOAJS_SOLO = true

#### the ip of the service
SOAJS_SRVIP = "127.0.0.1"

#### the service port 
SOAJS_SRVPORT = "4001"