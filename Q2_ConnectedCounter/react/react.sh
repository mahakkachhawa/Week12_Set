if [ -d "/home/coder/project/workspace/ConnectedCounter/src/tests/" ]
    then
        rm -r /home/coder/project/workspace/ConnectedCounter/src/tests;
fi
cp -r /home/coder/project/workspace/react/tests /home/coder/project/workspace/ConnectedCounter/src/;
cd /home/coder/project/workspace/ConnectedCounter/;
source /usr/local/nvm/nvm.sh
nvm use 16
export CI=true;
if [ -d "/home/coder/project/workspace/ConnectedCounter/node_modules" ]; then
    cd /home/coder/project/workspace/ConnectedCounter/
    npx react-scripts test --verbose --testPathPattern=src/tests 2>&1;
else
    cd /home/coder/project/workspace/ConnectedCounter/
    yes | npm install
    npx react-scripts test --verbose --testPathPattern=src/tests 2>&1;
fi
