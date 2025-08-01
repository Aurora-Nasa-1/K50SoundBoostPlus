#!/bin/bash
          echo "BUILD FOR MODULE"
          if [ "$MODID" = "" ]; then
          echo "please input MODID: "
          read MODID
          fi
          if [ -d "node_modules" ]; then
          echo "node_modules exists"
          else
          npm ci
          fi
          find src -name "*.js" -exec sed -i "s/ModuleWebUI/${MODID}/g" {} \;
          sed -i "s/ModuleWebUI/${MODID}/g" index.html
          npm run build:prod
          echo "BUILD DONE"