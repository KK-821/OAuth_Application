let accessToken = null;
let currentPage = 1;
let highlightedRow = null;

function addUser() {
    $.ajax({
        type: 'GET',
        url: '/get-token',
        success: function (response) {
            accessToken = response.access_token;
            sendAddUserRequest();
        },
        error: function (error) {
            alert('Failed to fetch access token');
        }
    });
}

function sendAddUserRequest() {
    const formData = {
        f_name: document.getElementById('f_name').value,
        l_name: document.getElementById('l_name').value,
        email_id: document.getElementById('email_id').value,
        phone_number: document.getElementById('phone_number').value,
        address: document.getElementById('address').value
    };

    $.ajax({
        type: 'POST',
        url: '/add-user',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function (response) {
            alert(response.message);
            getUsers();
        },
        error: function (error) {
            alert(error.responseJSON.error);
        }
    });
}



function getUsers(direction) {
    $.ajax({
        type: 'GET',
        url: `/list-users?page=${direction === 'prev' ? currentPage - 1 : currentPage + 1}`,
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        success: function (response) {
            displayUsers(response);
            currentPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
        },
        error: function (error) {
            alert(error.responseJSON.error);
            // If the error is due to an expired token, attempt to refresh the token
            if (error.status === 401 && error.responseJSON.error.includes('expired')) {
                refreshToken();
            }
        }
    });
}

function displayUsers(response) {
    const tableBody = document.querySelector('#userTable tbody');
    tableBody.innerHTML = '';

    response.users.forEach(user => {
        const row = `<tr>
                        <td>${user.id}</td>
                        <td>${user.f_name}</td>
                        <td>${user.l_name}</td>
                        <td>${user.email_id}</td>
                        <td>${user.phone_number}</td>
                        <td>${user.address}</td>
                        <td>${user.created_date}</td>
                    </tr>`;
        tableBody.innerHTML += row;
    });

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    prevBtn.disabled = !response.prev_url;
    nextBtn.disabled = !response.next_url;
}

function refreshToken() {
    console.log("Refreshing token...");
    // Make a request to get a new token
    $.ajax({
        type: 'GET',
        url: '/get-token',
        success: function (response) {
            accessToken = response.access_token;
            // Optionally, set a timer to refresh the token before it expires
            const refreshTime = parseJwt(response.access_token).exp - 60; // Refresh 60 seconds before expiry
            setTimeout(refreshToken, refreshTime * 1000);
        },
        error: function (error) {
            alert('Failed to fetch access token');
        }
    });
}


// Parse JWT to get the expiration time
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// Arrow key navigation
$(document).keydown(function (e) {
    if (e.key === "ArrowUp") {
        moveHighlightedRow(-1);
    } else if (e.key === "ArrowDown") {
        moveHighlightedRow(1);
    }
});

function moveHighlightedRow(direction) {
    const rows = $('#userTable tbody tr');
    if (!highlightedRow) {
        highlightedRow = rows.first();
    } else {
        const index = rows.index(highlightedRow);
        const newIndex = (index + direction + rows.length) % rows.length;
        highlightedRow.removeClass('highlighted');
        highlightedRow = rows.eq(newIndex);
    }

    highlightedRow.addClass('highlighted');
}

// Initial page load
$.ajax({
    type: 'GET',
    url: '/get-token',
    success: function (response) {
        accessToken = response.access_token;
        // Optionally, set a timer to refresh the token before it expires
        const refreshTime = parseJwt(response.access_token).exp - 60; // Refresh 60 seconds before expiry
        setTimeout(refreshToken, refreshTime * 1000);
    },
    error: function (error) {
        alert('Failed to fetch access token');
    }
});
