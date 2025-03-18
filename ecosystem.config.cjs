module.exports = {						//used for pm2
    apps: [								
        {
            name: "nuteach", 			// Application name
            script: "npm run start",
            instances: 1, 				// Number of instances to run
            autorestart: true, 			// Auto restart on failure
            watch: false, 				// Disable file watching; set to true to enable
			max_memory_restart: "300M", // OPTIONAL: Restart if memory exceeds limit
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",	//logging is Optional
            error_file: "logs/error.log",				//Optional
            out_file: "logs/app.log",					//Optional
            merge_logs: true,							//Optional
            env: {	//copy .env info (note comments below)
                NODE_ENV: "production",	//or "development"
                PORT: <put port number>,//Update - must be same as etc/httpd/conf.d/siteurl.conf file
                LOG_LEVEL: "info",		//logging is optional
                NUTEACH_DATABASE_URL: "<database url>",	
                SESSION_SECRET: "<put session secret here",			
                PUBLIC_APP_URL: "http://dev.appname.ok.ubc.ca",								//must be same as conf.d settings
                JUDGE0_WEBHOOK_URL: "http://172.17.0.1:1807/api/judge0",					//remove if judge0 not used
                JUDGE0_MULTIPLE_FILE_SUBMISSION_URL: "http://localhost:2358/submissions"	//remove if judge0 not used
            },
        },
    ],
}