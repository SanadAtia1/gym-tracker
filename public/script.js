const msgDiv = document.getElementById('message-handler');
        const dayButton = document.querySelector('.submit-day-btn');
        const dayForm = document.getElementById('day-form');
        const sessionForm = document.getElementById('session-form');
        const dayList = document.querySelector('.exercise-list');
        const logList = document.querySelector('.sess-log-list');
        const inputDay = document.querySelector('#day-select');
        const inputDate = document.querySelector('#sess-date');
        const dayDiv = document.querySelector('.day-section');
        const dayHead = document.getElementById('day-header');
        const sessHead = document.getElementById('session-header');
        const homeButton = document.getElementById('home-btn');
        const exerciseSection = document.querySelector('.exercise-section');
        const exerciseForm = document.getElementById('exercise-form');
        const exerciseName = document.getElementById('exercise-name');
        const exerciseSets = document.getElementById('exercise-sets');
        const exerciseReps = document.getElementById('exercise-reps');
        const exerciseDay = document.getElementById('exercise-day');
        const splitForm = document.getElementById('split-form');
        const splitDaysInput = document.getElementById('split-days');
        const authView = document.getElementById('auth-view');
        const appView = document.getElementById('app-view');
        const authCard = document.getElementById('auth-card');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        const resetPasswordForm = document.getElementById('reset-password-form');
        const devResetLink = document.getElementById('dev-reset-link');
        const logoutButton = document.getElementById('logout-btn');
        const userGreeting = document.getElementById('user-greeting');
        const verificationHelp = document.getElementById('verification-help');
        const verificationHelpText = document.getElementById('verification-help-text');
        const devVerificationLink = document.getElementById('dev-verification-link');
        const resendVerificationButton = document.getElementById('resend-verification-btn');
        const maxSplitDays = 14;
        let sessionID;
        let prevTimer;
        let pendingVerificationEmail = '';
        let passwordResetToken = '';

        function createBtn(text, id) {
            const button = document.createElement('button');
            button.textContent = text;
            button.id = id;
            return button;
        }

        function createNumberInput(className, label, value = '', step = '1') {
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.step = step;
            input.className = className;
            input.value = value;
            input.required = true;
            input.setAttribute('aria-label', label);
            return input;
        }

        function getLocalCalendarDate() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function formatExercise(exercise) {
            if (exercise.target_sets && exercise.target_reps) {
                return `${exercise.exercise} - ${exercise.target_sets} sets x ${exercise.target_reps} reps`;
            }
            return exercise.exercise;
        }

        function updateDayOptions(dayCount) {
            const previousDay = Number(inputDay.value) || 1;
            const previousExerciseDay = Number(exerciseDay.value) || 1;
            inputDay.replaceChildren();
            exerciseDay.replaceChildren();

            for (let day = 1; day <= dayCount; day += 1) {
                const dayOption = new Option(`Day ${day}`, day);
                const exerciseDayOption = new Option(`Day ${day}`, day);
                inputDay.add(dayOption);
                exerciseDay.add(exerciseDayOption);
            }

            inputDay.value = String(Math.min(previousDay, dayCount));
            exerciseDay.value = String(Math.min(previousExerciseDay, dayCount));
            splitDaysInput.value = dayCount;
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

        function showAuth() {
            appView.classList.add('hidden');
            authView.classList.remove('hidden');
            authCard.classList.remove('signup-mode', 'recovery-mode', 'reset-mode');
            loginForm.reset();
            signupForm.reset();
            forgotPasswordForm.reset();
            resetPasswordForm.reset();
            verificationHelp.classList.add('hidden');
            devVerificationLink.classList.add('hidden');
            devResetLink.classList.add('hidden');
            pendingVerificationEmail = '';
            passwordResetToken = '';
        }

        function showApp(user) {
            authView.classList.add('hidden');
            appView.classList.remove('hidden');
            userGreeting.textContent = `Signed in as ${user.name}`;
            updateDayOptions(user.split_days);
        }

        function showVerificationHelp(email, verificationUrl) {
            pendingVerificationEmail = email;
            verificationHelpText.textContent =
                `Check ${email} for a verification link before signing in.`;
            verificationHelp.classList.remove('hidden');
            authCard.classList.remove('signup-mode', 'recovery-mode', 'reset-mode');

            if (verificationUrl) {
                devVerificationLink.href = verificationUrl;
                devVerificationLink.classList.remove('hidden');
            } else {
                devVerificationLink.classList.add('hidden');
            }
        }

        async function apiFetch(url, options) {
            const response = await fetch(url, options);
            if (response.status === 401 && !url.startsWith('/auth/')) {
                showAuth();
                displayMsg('Your session expired. Please sign in again.', true);
                throw new Error('Authentication required');
            }
            return response;
        }

        document.getElementById('show-signup-btn').addEventListener('click', () => {
            authCard.classList.remove('recovery-mode', 'reset-mode');
            authCard.classList.add('signup-mode');
        });

        document.getElementById('show-login-btn').addEventListener('click', () => {
            authCard.classList.remove('signup-mode', 'recovery-mode', 'reset-mode');
        });

        document.getElementById('show-forgot-password-btn').addEventListener('click', () => {
            document.getElementById('recovery-email').value =
                document.getElementById('login-email').value;
            authCard.classList.remove('signup-mode', 'reset-mode');
            authCard.classList.add('recovery-mode');
        });

        document.querySelectorAll('.back-to-login-btn').forEach(button => {
            button.addEventListener('click', () => {
                authCard.classList.remove('signup-mode', 'recovery-mode', 'reset-mode');
                passwordResetToken = '';
            });
        });

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const response = await apiFetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById('login-email').value,
                    password: document.getElementById('login-password').value
                })
            });
            const data = await response.json();
            if (!data.success) {
                if (data.requiresVerification) {
                    showVerificationHelp(
                        document.getElementById('login-email').value
                    );
                }
                displayMsg(data.message, true);
                return;
            }
            showApp(data.user);
            displayMsg(data.message, false);
        });

        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const response = await apiFetch('/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: document.getElementById('signup-name').value,
                    email: document.getElementById('signup-email').value,
                    password: document.getElementById('signup-password').value
                })
            });
            const data = await response.json();
            if (!data.success) {
                if (data.accountCreated) {
                    showVerificationHelp(
                        document.getElementById('signup-email').value
                    );
                }
                displayMsg(data.message, true);
                return;
            }
            showVerificationHelp(
                document.getElementById('signup-email').value,
                data.verificationUrl
            );
            displayMsg(data.message, false);
        });

        resendVerificationButton.addEventListener('click', async () => {
            if (!pendingVerificationEmail) {
                return;
            }
            const response = await apiFetch('/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingVerificationEmail })
            });
            const data = await response.json();
            if (data.verificationUrl) {
                devVerificationLink.href = data.verificationUrl;
                devVerificationLink.classList.remove('hidden');
            }
            displayMsg(data.message, false);
        });

        forgotPasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const response = await apiFetch('/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById('recovery-email').value
                })
            });
            const data = await response.json();
            if (data.resetUrl) {
                devResetLink.href = data.resetUrl;
                devResetLink.classList.remove('hidden');
            }
            displayMsg(data.message, false);
        });

        resetPasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const password = document.getElementById('reset-password').value;
            const confirmation = document.getElementById('reset-password-confirm').value;
            if (password !== confirmation) {
                displayMsg('Passwords do not match.', true);
                return;
            }

            const response = await apiFetch('/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: passwordResetToken, password })
            });
            const data = await response.json();
            if (!data.success) {
                displayMsg(data.message, true);
                return;
            }

            resetPasswordForm.reset();
            passwordResetToken = '';
            authCard.classList.remove('reset-mode');
            displayMsg(data.message, false);
        });

        logoutButton.addEventListener('click', async () => {
            await apiFetch('/auth/logout', { method: 'POST' });
            homeButton.click();
            showAuth();
            displayMsg('Signed out', false);
        });

        async function initializeAuth() {
            const params = new URLSearchParams(window.location.search);
            if (params.get('resetToken')) {
                showAuth();
                passwordResetToken = params.get('resetToken');
                authCard.classList.add('reset-mode');
                window.history.replaceState({}, '', '/');
                return;
            }

            const response = await fetch('/auth/me');
            if (!response.ok) {
                showAuth();
                if (params.get('verification') === 'invalid') {
                    displayMsg('That verification link is invalid or expired.', true);
                }
                window.history.replaceState({}, '', '/');
                return;
            }
            const data = await response.json();
            showApp(data.user);
            if (params.get('verified') === '1') {
                displayMsg('Email verified. Your account is ready.', false);
            }
            window.history.replaceState({}, '', '/');
        }

        initializeAuth();

        async function getDays(url, createInputFields) {
            const response = await apiFetch(url);
            const data = await response.json();
            dayList.replaceChildren();
            dayList.style.display = 'inline-block';
            data.forEach(day => {
                if (!createInputFields) {
                    const li = document.createElement('li');
                    li.className = 'list-elements';
                    const span = document.createElement('span');
                    span.textContent = formatExercise(day);
                    li.appendChild(span);

                    const exerciseActions = document.createElement('div');
                    exerciseActions.className = 'exercise-actions';
                    li.appendChild(exerciseActions);

                    const editExerciseBtn = createBtn('Edit', 'edit-exercise-btn');
                    exerciseActions.appendChild(editExerciseBtn);

                    const removeExerciseBtn = createBtn('Delete', 'remove-exercise-btn');
                    exerciseActions.appendChild(removeExerciseBtn);

                    editExerciseBtn.addEventListener('click', () => {
                        showExerciseEditor(li, span, editExerciseBtn, removeExerciseBtn, day);
                    });

                    removeExerciseBtn.addEventListener('click', () => {
                        editExerciseBtn.style.display = 'none';
                        removeExerciseBtn.style.display = 'none';

                        const confirmation = document.createElement('div');
                        confirmation.className = 'remove-confirmation';

                        const prompt = document.createElement('span');
                        prompt.textContent = `Delete from Day ${day.day}?`;

                        const confirmButton = createBtn('Delete', 'confirm-remove-exercise-btn');
                        const keepButton = createBtn('Cancel', 'keep-exercise-btn');
                        confirmButton.type = 'button';
                        keepButton.type = 'button';
                        confirmation.append(prompt, confirmButton, keepButton);
                        exerciseActions.appendChild(confirmation);

                        keepButton.addEventListener('click', () => {
                            confirmation.remove();
                            editExerciseBtn.style.display = 'inline-block';
                            removeExerciseBtn.style.display = 'inline-block';
                        });

                        confirmButton.addEventListener('click', async () => {
                            const response = await apiFetch(
                                `/days/${day.day}/exercises/${day.exercise_id}`,
                                { method: 'DELETE' }
                            );
                            const data = await response.json();

                            if (!data.success) {
                                displayMsg(data.message, true);
                                return;
                            }

                            li.remove();
                            displayMsg(data.message, false);
                        });
                    });

                    dayList.appendChild(li); 
                } else {
                    const li = logExercise(day);
                    dayList.appendChild(li);
                }
            });
        }

        function showExerciseEditor(li, span, editButton, removeButton, exercise) {
            editButton.style.display = 'none';
            removeButton.style.display = 'none';

            const controls = document.createElement('form');
            controls.className = 'edit-exercise-controls';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'edit-exercise-name';
            nameInput.value = exercise.exercise;
            nameInput.required = true;
            nameInput.setAttribute('aria-label', 'Exercise name');

            const setsInput = document.createElement('input');
            setsInput.type = 'number';
            setsInput.min = '1';
            setsInput.className = 'edit-exercise-sets';
            setsInput.value = exercise.target_sets || '';
            setsInput.required = true;
            setsInput.setAttribute('aria-label', 'Target sets');

            const repsInput = document.createElement('input');
            repsInput.type = 'number';
            repsInput.min = '1';
            repsInput.className = 'edit-exercise-reps';
            repsInput.value = exercise.target_reps || '';
            repsInput.required = true;
            repsInput.setAttribute('aria-label', 'Target reps');

            const saveButton = createBtn('Save', 'save-exercise-btn');
            const cancelButton = createBtn('Cancel', 'cancel-exercise-btn');
            cancelButton.type = 'button';

            controls.append(nameInput, setsInput, repsInput, saveButton, cancelButton);
            li.appendChild(controls);

            cancelButton.addEventListener('click', () => {
                controls.remove();
                editButton.style.display = 'inline-block';
                removeButton.style.display = 'inline-block';
            });

            controls.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (
                    !nameInput.reportValidity() ||
                    !setsInput.reportValidity() ||
                    !repsInput.reportValidity()
                ) {
                    return;
                }

                const response = await apiFetch(`/exercises/${exercise.exercise_id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        exercise: nameInput.value,
                        sets: setsInput.value,
                        reps: repsInput.value
                    })
                });
                const data = await response.json();

                if (!data.success) {
                    displayMsg(data.message, true);
                    return;
                }

                Object.assign(exercise, data.exercise);
                span.textContent = formatExercise(exercise);
                controls.remove();
                editButton.style.display = 'inline-block';
                removeButton.style.display = 'inline-block';
                displayMsg(data.message, false);
            });
        }

        function logExercise(day) {
            const li = document.createElement('li');
            li.className = 'list-elements';
            const span = document.createElement('span');
            if (day.weight == null || day.reps == null) {
                span.textContent = formatExercise(day);
            } else {
                span.textContent = `${formatExercise(day)} ( Previous: ${day.weight} lbs x ${day.reps} reps )`;
            }
            li.appendChild(span);
            const div = document.createElement('form');
            div.className = 'list-divs';
            const newWeight = createNumberInput('new-weight-input', 'Weight', '', 'any');
            const newReps = createNumberInput('new-reps-input', 'Completed reps');
            div.append(
                newWeight,
                document.createTextNode(' lbs x '),
                newReps,
                document.createTextNode(' reps')
            );
            li.appendChild(div);

            const logExerciseBtn = createBtn('Log', 'new-log-btn');
            div.appendChild(logExerciseBtn);

            div.addEventListener('submit', (event) => {
                event.preventDefault();
                async function newLog(url) {
                    const response = await apiFetch(url, {
                        method: 'POST', 
                        headers: {
                            'Content-Type': 'application/json' 
                        },
                        body: JSON.stringify({ sessionID: sessionID, exerciseID: day.exercise_id, weight: newWeight.value, reps: newReps.value})
                    });
                    const data = await response.json();
                    if (data.success) {
                        span.textContent = `${formatExercise(day)} - ${newWeight.value} lbs x ${newReps.value} reps`;
                        div.remove();
                    }else {
                        displayMsg(data.message, true);
                    }
                }
                if (!newWeight.reportValidity() || !newReps.reportValidity()) {
                    return;
                }
                newLog(`/logs`);
            });

            return li;
         }

        homeButton.addEventListener('click', () => {
            dayList.replaceChildren();
            logList.replaceChildren();
            dayList.style.display = 'none';
            logList.style.display = 'none';
            dayHead.innerText = 'Begin logging';
            sessHead.innerText = 'View Sessions';
            inputDate.value = '';
            inputDay.value = '1';
            exerciseForm.reset();
            exerciseDay.value = '1';
            exerciseSection.open = false;
            sessionID = undefined;

            const createSession = document.getElementById('create-sess-btn');
            if (createSession) {
                createSession.remove();
            }

            if (prevTimer > 0) {
                clearTimeout(prevTimer);
            }
            msgDiv.textContent = '';
            msgDiv.classList.remove('error');
        });

        splitForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const requestedDays = Number(splitDaysInput.value);

            if (
                !Number.isInteger(requestedDays) ||
                requestedDays < 1 ||
                requestedDays > maxSplitDays
            ) {
                splitDaysInput.reportValidity();
                return;
            }

            const response = await apiFetch('/users/me/split', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ splitDays: requestedDays })
            });
            const data = await response.json();
            if (!data.success) {
                displayMsg(data.message, true);
                return;
            }

            updateDayOptions(data.splitDays);
            dayList.style.display = 'none';
            dayHead.innerText = 'View exercises - Begin logging';

            const createSession = document.getElementById('create-sess-btn');
            if (createSession) {
                createSession.remove();
            }

            displayMsg(data.message, false);
        });

        exerciseForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const response = await apiFetch('/exercises', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    exercise: exerciseName.value,
                    sets: exerciseSets.value,
                    reps: exerciseReps.value,
                    day: exerciseDay.value
                })
            });
            const data = await response.json();

            if (!data.success) {
                displayMsg(data.message, true);
                return;
            }

            displayMsg(data.message, false);
            exerciseName.value = '';
            exerciseSets.value = '';
            exerciseReps.value = '';
            inputDay.value = exerciseDay.value;
            dayButton.click();
            exerciseName.focus();
        });

        dayForm.addEventListener('submit', (event) => {
            event.preventDefault();
            dayList.style.display = 'inline-block';
            const value = inputDay.value;
            dayHead.innerText = `Day ${value}`;
            getDays(`/days/${value}`, false);

            if (!document.getElementById('create-sess-btn')) {
                const createSession = createBtn('Create new session', 'create-sess-btn');
                dayDiv.appendChild(createSession);

                createSession.addEventListener('click', () => {
                    async function newSession(url) {
                        const response = await apiFetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                day: value,
                                date: getLocalCalendarDate()
                            })
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

        sessionForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const value = inputDate.value;
            logList.style.display = 'inline-block';
            logList.replaceChildren();
            async function getLogs(url) {
                const response = await apiFetch(url);
                const data = await response.json();
                if (data.logsExist) {
                    sessHead.innerText = `Day ${data.logs[0].dayLogged} - Logged on ${data.logs[0].date} `;

                    const logMoreBtn = createBtn('Add more logs', 'log-more-btn');
                    logList.appendChild(logMoreBtn);
                    sessionID = data.logs[0].session_id;

                    logMoreBtn.addEventListener('click', () => {
                        async function getNullLogs(url) {
                            const response = await apiFetch(url);
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
                                const span2 = document.createElement('form');
                                span2.className = 'edit-log-controls';
                                const updatedWeight = createNumberInput(
                                    'updated-weight-input',
                                    'Weight',
                                    log.weight,
                                    'any'
                                );
                                const updatedReps = createNumberInput(
                                    'updated-reps-input',
                                    'Completed reps',
                                    log.reps
                                );
                                span2.append(
                                    updatedWeight,
                                    document.createTextNode(' lbs x '),
                                    updatedReps,
                                    document.createTextNode(' reps')
                                );
                                li.appendChild(span2);
                                span.textContent = `${log.exercise}: `;
                                inputsCreated = true;

                                const saveEditBtn = createBtn('Save', 'save-edit-btn');
                                span2.appendChild(saveEditBtn);

                                span2.addEventListener('submit', (event) => {
                                    event.preventDefault();
                                    if (!updatedWeight.reportValidity() || !updatedReps.reportValidity()) {
                                        return;
                                    }

                                    async function updateLog(url) {
                                        const response = await apiFetch(url, {
                                            method: 'PATCH',
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({ weight: updatedWeight.value, reps: updatedReps.value }) 
                                        });
                                        const data = await response.json();
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
                                cancelEditBtn.type = 'button';
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
                                const response = await apiFetch(url, {
                                    method: 'DELETE'
                                });
                                const data = await response.json();
                                li.remove();
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
                            dayHead.innerText = `Day ${data.session.dayLogged}`;
                            getDays(`/days/${data.session.dayLogged}`, true);
                            logList.style.display = 'none';
                            sessHead.innerText = 'View/Edit/Delete Sessions';
                        });

                        const deleteSessionBtn = createBtn('Delete session', 'delete-session-btn');
                        div.appendChild(deleteSessionBtn);

                        deleteSessionBtn.addEventListener('click', () => {
                            async function delSession(url) {
                                const response = await apiFetch(url, {
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