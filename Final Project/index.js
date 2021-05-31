// Used for storing results of fetch for artworks and departments.
let artworks = [];
let departments = [];
// Used when fetching artworks by title (or query text), department, and highlight status
let titleParam = "";
let departmentIdParam="";
let isHighlightParam="";
let controller = new AbortController();

// Helper function to get window's url query parameters by name
// Source: https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
// Helper function to create new image DOM nodes for each artwork fetched.
function appendArtwork(artworkData)
{
    let imageGallery = document.getElementById('image-gallery')
    // Create artwork container
    let newArtwork = document.createElement('div');
    newArtwork.classList.add('artwork-image');
    imageGallery.appendChild(newArtwork);
    // Add artwork preview image
    let newImage_img = document.createElement('img');
    newImage_img.classList.add('new-artwork-image');
    newImage_img.setAttribute('src',artworkData.primaryImageSmall);
    newArtwork.appendChild(newImage_img);
    // Add artwork large image
    let newLargeImage_img = document.createElement('img');
    newLargeImage_img.classList.add('new-large-artwork-image');
    newLargeImage_img.setAttribute('src',artworkData.primaryImage);
    newLargeImage_img.style.display="none";
    newArtwork.appendChild(newLargeImage_img);
    // Add artwork's title (title)
    let artworkTitle_h2 = document.createElement('h2')
    artworkTitle_h2.innerHTML = artworkData.title;
    newArtwork.appendChild(artworkTitle_h2);
    // Add artwork's medium
    let artworkMedium_p = document.createElement('p')
    artworkMedium_p.innerHTML = artworkData.medium;
    newArtwork.appendChild(artworkMedium_p);
    // Add artwork's artist name (artistDisplayName)
    let artistDisplayName_p = document.createElement('p')
    artistDisplayName_p.innerHTML = artworkData.artistDisplayName;
    newArtwork.appendChild(artistDisplayName_p);
    // Add artwork's artist bio (artistDisplayBio)
    let artistBio_p = document.createElement('p')
    artistBio_p.innerHTML = artworkData.artistDisplayBio;
    newArtwork.appendChild(artistBio_p);
    // Add artwork's credit line (creditLine)
    let artworkCreditLine_p = document.createElement('p')
    artworkCreditLine_p.innerHTML = artworkData.creditLine;
    newArtwork.appendChild(artworkCreditLine_p);
    // And then suddenly a wild JQuery appears
    // What this does: 
    // - Gets the invisible large image (embedded in the artwork card)'s src attribute 
    // - Sets the modal's image to have the same src attribute as the former.
    // Does it work? Yes. Am I proud of this code? Not really. 
    $(`.artwork-image`).click(function()
    {
        $(`.modal-body #artwork-image-modal`).attr('src',
            $(this).find('.new-large-artwork-image').attr('src'))
        $('#artwork-modal').modal()
    })
    
}

// Function to generate gallery controls (department filters)
async function generateGalleryControls()
{
    let imageGalleryControls = document.getElementById('image-gallery-controls')
    // Fetch department types
    departments = await fetch('https://collectionapi.metmuseum.org/public/collection/v1/departments')
                    .then(response=>response.json())
                    .then(data=>{
                        return data.departments;
                    })
    console.log(departments);
    
    // Add on change listener for Is Highlight Checkbox
    let isHighlight_checkbox = document.getElementById("is-highlight");
    isHighlight_checkbox.onchange = function () {
        if(isHighlight_checkbox.checked)
        {
            isHighlightParam = isHighlight_checkbox.getAttribute("value");
        }
        else
        {
            isHighlightParam = "";
        }
        console.log(`IS HIGHLIGHT: ${isHighlightParam}`)
        controller.abort();
        renderArtworks();
    }
    // Add on change listener for search bar
    let searchBar_text = document.getElementById("search-bar");
    searchBar_text.onchange = function () {
        titleParam = searchBar_text.value;
        controller.abort();
        renderArtworks();
    }
    // Add on change listener for "None" department choice
    let departmentNone_input = document.getElementById("department-none");
    departmentNone_input.onchange = function () {
        departmentIdParam = departmentNone_input.value;
        controller.abort();
        renderArtworks();
    }
    // Create container ul element for all department radio inputs.
    let departmentChoices_ul = document.getElementById('department-choices');
    for(let i = 0; i < departments.length; i++)
    {
        // Department data
        let department = departments[i];
        // Create container li element for the radio input.
        let departmentChoice_li = document.createElement('li');
        departmentChoice_li.classList.add('department-choice');
        departmentChoices_ul.appendChild(departmentChoice_li);
        // Create radio input for department
        let departmentSelection_input = document.createElement('input');
        departmentSelection_input.setAttribute('type', 'radio');
        departmentSelection_input.setAttribute('value', department.departmentId.toString());
        departmentSelection_input.setAttribute('name',"departmentId");
        departmentSelection_input.classList.add('department-selection');
        departmentSelection_input.setAttribute('id',`department-${department.departmentId}`);
        departmentChoice_li.appendChild(departmentSelection_input);
        // Add onchange listener to input to update artworks accordingly
        departmentSelection_input.onchange = function() {
            departmentIdParam = departmentSelection_input.getAttribute("value");
            controller.abort();
            renderArtworks();
        }
        // Create label for the radio input
        let departmentSelection_label = document.createElement('label');
        departmentSelection_label.setAttribute('for',`department-${department.departmentId}`);
        departmentSelection_label.innerHTML = department.displayName;
        departmentChoice_li.appendChild(departmentSelection_label);
    }
}
// Probably You: Red, why are there so many aborts?
// Me: Because I can't use React...

// Serious answer: when fetching the artwork data and updating via fetch,
// it can occur that the fetched data is still being loaded
// while another fetch request for the same data is going on.
// The result: duplicated data that doesn't get cleared on its own.
// The hack: just add an AbortController, and abort fetch requests when "refreshing"
async function getArtworks(title="",departmentId="",isHighlight="")
{
    let queryUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?` +
                    `q=${title}&`+
                    (departmentId?`departmentId=${departmentId}&`:'')+
                    (isHighlight?`isHighlight=${isHighlight}&`:'') +
                    `hasImages=true`; 
    const { signal } = controller;
    artworks = await fetch(queryUrl,{signal})
                .then(response=>response.json())
                .then(async (data)=>{
                    let results = []
                    if(data.objectIDs)
                    {
                        for(let i = 0; i < Math.min(10,data.objectIDs.length); i++)
                        {
                            let artworkDataUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${data.objectIDs[i]}`;
                            await fetch(artworkDataUrl, {signal})
                                .then(response=>response.json())
                                .then(async (artworkData)=>{
                                    if(artworkData.primaryImageSmall.length > 0 || artworkData.primaryImage.length > 0)
                                    {
                                        appendArtwork(artworkData);
                                        results.push(artworkData);
                                    }
                                })
                                .catch(error=>{
                                    clearArtworks();
                                    console.log(error);
                                });
                        }
                    }
                    return results;
                })
                .catch((error)=>{
                    console.log(error);
                    clearArtworks();
                    return [];
                });
    console.log(artworks.length);
    for(let i = 0; i < artworks.length; i++)
    {
        console.log(artworks[i]);
    }
}
function clearArtworks()
{
    let imageGallery = document.getElementById('image-gallery');
    if(imageGallery)
    {
        imageGallery.innerHTML = '';
    }
}
async function renderArtworks()
{
    // Retrieve all artworks with given parameters
    await controller.abort();
    artworks = []
    controller = new AbortController();
    await clearArtworks();
    await getArtworks(titleParam,departmentIdParam,isHighlightParam);
}

// INITIALIZE THE PAGE:
// Create gallery controls
generateGalleryControls();
renderArtworks();
