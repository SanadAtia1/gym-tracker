const msgDiv = document.getElementById('message-handler');
        const dayButton = document.querySelector('.submit-day-btn');
        const viewSessionButton = document.querySelector('.submit-date-btn');
        const dayList = document.querySelector('.exercise-list');
        const logList = document.querySelector('.sess-log-list');
        const inputDay = document.querySelector('#day-select');
        const inputDate = document.querySelector('#sess-date');
        const containerDiv = document.querySelector('.container');
        const dayDiv = document.querySelector('.day-section');
        const sessionDiv = document.querySelector('.session-section');
        const dayHead = document.getElementById('day-header');
        const sessHead = document.getElementById('session-header');
        let sessionID;
        let prevTimer;

        function createBtn(text, id) {
            const button = document.createElement('button');
            button.textContent = text;
            button.id = id;
            return button;
        }

        function displayMsg(text, isError) {
            if (prevTimer > 0) {
                clearTimeout(prevTimer);
            }
            if (isError) {
                msgDiv.classList.add('error');
            }
            msgDiv.textContent = text;

            prevTimer = setTimeout(() => {
                msgDiv.textContent = '';
                msgDiv.classList.remove('error');
            }, 4500);
        }

        async function getDays(url, createInputFields) {
            const response = await fetch(url);
            const data = await response.json();
            dayList.innerHTML = '';
            dayList.style.display = 'inline-block';
            data.forEach(day => {
                if (!createInputFields) {
                    const li = document.createElement('li');
                    li.textContent = day.exercise;
                    dayList.appendChild(li); 
                } else {
                    const li = logExercise(day);
                    dayList.appendChild(li);
                }
            });
        }

        function logExercise(day) {
            const li = document.createElement('li');
            const span = document.createElement('span');
            if (!day.weight || !day.reps) { 
                span.innerHTML = `${day.exercise} 
                <input type = 'number' class = 'new-weight-input'> lbs x 
                <input type = 'number' class = 'new-reps-input'> reps `;
            } else {
                span.innerHTML = `${day.exercise} ( Previous: ${day.weight} lbs x ${day.reps} reps ) <br>
                <input type = 'number' class = 'new-weight-input'> lbs x 
                <input type = 'number' class = 'new-reps-input'> reps `;
            }
            li.appendChild(span);
            const newWeight = li.querySelector('.new-weight-input');
            const newReps = li.querySelector('.new-reps-input');

            const logExerciseBtn = createBtn('Log', 'new-log-btn');
            span.appendChild(logExerciseBtn);

            logExerciseBtn.addEventListener('click', () => {
                async function newLog(url) {
                    const response = await fetch(url, {
                        method: 'POST', 
                        headers: {
                            'Content-Type': 'application/json' 
                        },
                        body: JSON.stringify({ sessionID: sessionID, exerciseID: day.exercise_id, weight: newWeight.value, reps: newReps.value})
                    });
                    const data = await response.json();
                    if (data.success) {
                        span.innerHTML = `${day.exercise} - ${newWeight.value} lbs x ${newReps.value} reps`
                    }else {
                        displayMsg(data.message, true);
                    }
                }
                if (newWeight.value < 0 || newReps.value < 0){
                    displayMsg('No negative values', true);
                }else {
                    newLog(`/logs`);
                }
            });

            return li;
         }

         if (!document.getElementById('clear-dayList-btn')) {
            const clearDaylist = createBtn('Clear', 'clear-dayList-btn');
            dayDiv.appendChild(clearDaylist);

            clearDaylist.addEventListener('click', () => {
                dayList.style.display = 'none';
                if (createSession = document.getElementById('create-sess-btn')) {
                    createSession.remove();
                }
               dayHead.innerText = 'View exercises - Begin logging' 
            });
        }

        if (!document.getElementById('clear-logList-btn')) {
            const clearLoglist = createBtn('Clear', 'clear-logList-btn');
            sessionDiv.appendChild(clearLoglist);

            clearLoglist.addEventListener('click', () => {
                logList.style.display = 'none';
                sessHead.innerText = 'View/Edit/Delete Sessions'
            });
        }

        dayButton.addEventListener('click', () => {
            const value = inputDay.value;
            if(value == 1) {
                dayHead.innerText = `Day ${value} Upper A`;
            } else if(value == 2) {
                dayHead.innerText = `Day ${value} Lower A`;
            } else if(value == 3) {
                dayHead.innerText = `Day ${value} Upper B`;
            } else if(value == 4) {
                dayHead.innerText = `Day ${value} Lower B`;
            } else if(value == 5) {
                dayHead.innerText = `Day ${value} Upper C`;
            } else {
                dayHead.innerText = `Day ${value} Plyometrics`;
            }
            getDays(`/days/${value}`, false);

            if (!document.getElementById('create-sess-btn')) {
                const createSession = createBtn('Create new session', 'create-sess-btn');
                dayDiv.appendChild(createSession);

                createSession.addEventListener('click', () => {
                    async function newSession(url) {
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ day: value }) 
                        });
                        const data = await response.json();
                        if(!data.duplicate) {
                            sessionID = data.sessID;
                            displayMsg(data.message, false);
                            getDays(`/days/${value}`, true);
                        } else {
                            displayMsg(data.message, true);
                        }
                    }

                    newSession(`/sessions`);
                    createSession.remove();
                });
            }
        });

        viewSessionButton.addEventListener('click', () => {
            const value = inputDate.value;
            logList.style.display = 'inline-block';
            logList.innerHTML = '';
            async function getLogs(url) {
                const response = await fetch(url);
                const data = await response.json();
                if (data.logsExist) {
                    sessHead.innerText= `Day ${data.logs[0].dayLogged} - Logged on ${data.logs[0].date} `;

                    const logMoreBtn = createBtn('Add more logs', 'log-more-btn');
                    logList.appendChild(logMoreBtn);
                    sessionID = data.logs[0].session_id;

                    logMoreBtn.addEventListener('click', () => {
                        async function getNullLogs(url) {
                            const response = await fetch(url);
                            const data = await response.json();
                            if(data.logsExist) {
                                logMoreBtn.remove();
                                data.logs.forEach(log => {
                                    const li = logExercise(log);
                                    logList.appendChild(li);

                                });
                            } else {
                                logMoreBtn.remove();
                                displayMsg(data.message, true);
                            }
                        };
                        getNullLogs(`/sessions/${sessionID}/day/${data.logs[0].dayLogged}`);
                    });

                    data.logs.forEach(log => {
                        const li = document.createElement('li');
                        const span = document.createElement('span');
                        span.textContent = `${log.exercise}: ${log.weight} lbs x ${log.reps} reps`;
                        li.appendChild(span);

                        let inputsCreated = false;
                        const editBtn = createBtn('Edit', 'edit-log-btn');
                        li.appendChild(editBtn);

                        editBtn.addEventListener('click', () => {
                            editBtn.style.display = 'none';
                            deleteLogBtn.style.display = 'none';
                            if (!inputsCreated) {
                                const span2 = document.createElement('span');
                                span2.innerHTML = `<input type = 'number' class = 'updated-weight-input' value = ${log.weight}> lbs x 
                                <input type = 'number' class = 'updated-reps-input' value = ${log.reps}> reps`;
                                li.appendChild(span2);
                                const updatedWeight = li.querySelector('.updated-weight-input');
                                const updatedReps = li.querySelector('.updated-reps-input');
                                span.textContent = `${log.exercise}: `;
                                inputsCreated = true;

                                const saveEditBtn = createBtn('Save', 'save-edit-btn');
                                span2.appendChild(saveEditBtn);

                                saveEditBtn.addEventListener('click', () => {
                                    async function updateLog(url) {
                                        const response = await fetch(url, {
                                            method: 'PATCH',
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({ weight: updatedWeight.value, reps: updatedReps.value }) 
                                        });
                                        const data = await response.json();
                                        console.log(data.message);
                                        if (data.success) {
                                            if (updatedWeight.value) {log.weight = updatedWeight.value;}
                                            if (updatedReps.value) {log.reps = updatedReps.value;}
                                            span.textContent = `${log.exercise}: ${log.weight} lbs x ${log.reps} reps`;
                                            span2.remove();
                                            editBtn.style.display = 'inline-block';
                                            deleteLogBtn.style.display = 'inline-block';
                                            inputsCreated = false;
                                            displayMsg(data.message, false);
                                        } else {
                                           displayMsg(data.message, true);
                                        }
                                    }
                                    updateLog(`/logs/${log.log_id}`)
                                });
                            
                                const cancelEditBtn = createBtn('Cancel', 'cancel-edit-btn');
                                span2.appendChild(cancelEditBtn);

                                cancelEditBtn.addEventListener('click', () => {
                                    span.textContent = `${log.exercise}: ${log.weight} lbs x ${log.reps} reps`;
                                    span2.remove();
                                    editBtn.style.display = 'inline-block';
                                    deleteLogBtn.style.display = 'inline-block';
                                    inputsCreated = false;
                                });
                            }
                        });

                        const deleteLogBtn = createBtn('Delete', 'delete-log-btn');
                        li.appendChild(deleteLogBtn);

                        deleteLogBtn.addEventListener('click', () => {
                            async function delLog(url) {
                                const response = await fetch(url, {
                                    method: 'DELETE'
                                });
                                const data = await response.json();
                                li.innerHTML = '';
                                displayMsg(data.message, false);
                            }
                            delLog(`/logs/${log.log_id}`);
                        });
                        logList.appendChild(li); 
                    });
                } else {
                    if (data.sessionExists) {
                        logList.innerHTML = `No workouts logged on ${data.session.date}: `

                        const deleteSessionBtn = createBtn('Delete session', 'delete-session-btn');
                        logList.appendChild(deleteSessionBtn);

                        deleteSessionBtn.addEventListener('click', () => {
                            async function delSession(url) {
                                const response = await fetch(url, {
                                    method: 'DELETE'
                                });
                                const data = await response.json();
                                logList.innerHTML = 'No session on this day';
                                displayMsg(data.message, false);
                            }
                            delSession(`/sessions/${data.session.session_id}`);
                        });

                        const addLogsBtn = createBtn('Add logs', 'add-logs-btn');
                        logList.appendChild(addLogsBtn);

                        addLogsBtn.addEventListener('click', () => {
                            if (document.getElementById('delete-session-btn')) {
                                deleteSessionBtn.remove();
                            }
                            addLogsBtn.remove();
                            sessionID = data.session.session_id;
                            getDays(`/days/${data.session.dayLogged}`, true);
                        });
                    } else {
                        displayMsg(data.message, true);
                    }
                }
            }

            getLogs(`/sessions/${value}`);
        });