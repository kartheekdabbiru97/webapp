#!/bin/bash

#give permission for everything in the express-app directory
sudo chmod -R 777 /home/ubuntu/webApp

#copying .env to webapp
cp /home/ubuntu/.env /home/ubuntu/webApp

#navigate into our working directory where we have all our github files
cd /home/ubuntu/webApp

#add npm and node to path
#export NVM_DIR="$HOME/.nvm"	
#[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # loads nvm	
#[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # loads nvm bash_completion (node is in path now)

#install node modules
npm install

#install nodemon
#npm install nodemon

#start our node app in the background
npm start > app.out.log 2> app.err.log < /dev/null & 

#Install cloudwatch agent and fetch cloudwatch metrics from json file
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
-a fetch-config \
-m ec2 \
-c file://home/ubuntu/webapp/aws-cw-log.json\
-s
