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
                msgDiv.classList.remove('error');
            }
            if (isError) {
                msgDiv.classList.add('error');
            }
            msgDiv.textContent = text;

            prevTimer = setTimeout(() => {
                msgDiv.textContent = '';
            }, 3000);
        }

        async function getDays(url, createInputFields) {
            const response = await fetch(url);
            const data = await response.json();
            dayList.innerHTML = '';
            dayList.style.display = 'inline-block';
            data.forEach(day => {
                if (!createInputFields) {
                    const li = document.createElement('li');
                    li.className = 'list-elements';
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
            li.className = 'list-elements';
            const span = document.createElement('span');
            if (!day.weight || !day.reps) { 
                span.innerHTML = `${day.exercise}`;
            } else {
                span.innerHTML = `${day.exercise} ( Previous: ${day.weight} lbs x ${day.reps} reps )`;
            }
            li.appendChild(span);
            const div = document.createElement('div');
            div.className = 'list-divs';
            div.innerHTML = `<input type = 'number' class = 'new-weight-input'> lbs x 
                <input type = 'number' class = 'new-reps-input'> reps`;
            const newWeight = div.querySelector('.new-weight-input');
            const newReps = div.querySelector('.new-reps-input');
            li.appendChild(div);

            const logExerciseBtn = createBtn('Log', 'new-log-btn');
            div.appendChild(logExerciseBtn);

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
                        div.remove();
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
               dayHead.innerText = 'View exercises - Begin logging';
            });
        }

        if (!document.getElementById('clear-logList-btn')) {
            const clearLoglist = createBtn('Clear', 'clear-logList-btn');
            sessionDiv.appendChild(clearLoglist);

            clearLoglist.addEventListener('click', () => {
                logList.style.display = 'none';
                sessHead.innerText = 'View/Edit/Delete Sessions';
            });
        }

        dayButton.addEventListener('click', () => {
            dayList.style.display = 'inline-block';
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
                    sessHead.innerText = `Day ${data.logs[0].dayLogged} - Logged on ${data.logs[0].date} `;

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
                        li.className = 'list-elements';
                        const span = document.createElement('span');
                        span.textContent = `${log.exercise}: ${log.weight} lbs x ${log.reps} reps`;
                        li.appendChild(span);
                        const div = document.createElement('div');
                        div.className = 'list-divs';
                        li.appendChild(div);

                        let inputsCreated = false;
                        const editBtn = createBtn('Edit', 'edit-log-btn');
                        div.appendChild(editBtn);

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
                        div.appendChild(deleteLogBtn);

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
                        sessHead.innerText = `Session created ${data.session.date}`;
                        const li = document.createElement('li');
                        li.className = 'list-elements';
                        const span = document.createElement('span');
                        span.textContent = `No logs found `;
                        li.appendChild(span);
                        const div = document.createElement('div');
                        div.className = 'list-divs';
                        li.appendChild(div);

                        const addLogsBtn = createBtn('Add logs', 'add-logs-btn');
                        div.appendChild(addLogsBtn);

                        addLogsBtn.addEventListener('click', () => {
                            if (document.getElementById('delete-session-btn')) {
                                deleteSessionBtn.remove();
                            }
                            addLogsBtn.remove();
                            sessionID = data.session.session_id;
                            if(data.session.dayLogged == 1) {
                                dayHead.innerText = `Day ${data.session.dayLogged} Upper A`;
                            } else if(data.session.dayLogged == 2) {
                                dayHead.innerText = `Day ${data.session.dayLogged} Lower A`;
                            } else if(data.session.dayLogged == 3) {
                                dayHead.innerText = `Day ${data.session.dayLogged} Upper B`;
                            } else if(data.session.dayLogged == 4) {
                                dayHead.innerText = `Day ${data.session.dayLogged} Lower B`;
                            } else if(data.session.dayLogged == 5) {
                                dayHead.innerText = `Day ${data.session.dayLogged} Upper C`;
                            } else {
                                dayHead.innerText = `Day ${data.session.dayLogged} Plyometrics`;
                            }
                            getDays(`/days/${data.session.dayLogged}`, true);
                            logList.style.display = 'none';
                            sessHead.innerText = 'View/Edit/Delete Sessions';
                        });

                        const deleteSessionBtn = createBtn('Delete session', 'delete-session-btn');
                        div.appendChild(deleteSessionBtn);

                        deleteSessionBtn.addEventListener('click', () => {
                            async function delSession(url) {
                                const response = await fetch(url, {
                                    method: 'DELETE'
                                });
                                const data = await response.json();
                                logList.style.display = 'none';
                                sessHead.innerText = 'View/Edit/Delete Sessions';
                                dayList.style.display = 'none';
                                dayHead.innerText = 'View exercises - Begin logging'; 
                                displayMsg(data.message, false);
                            }
                            delSession(`/sessions/${data.session.session_id}`);
                        });

                        logList.appendChild(li);
                    } else {
                        displayMsg(data.message, true);
                    }
                }
            }

            getLogs(`/sessions/${value}`);
        });