#!/bin/bash
mongosh --quiet mongodb://localhost:27017/dmo-kb --eval 'db.users.find({role:{$in:["admin","owner"]}},{email:1,role:1,username:1}).forEach(u=>print(u.email+" | "+u.role+" | "+u.username))'
