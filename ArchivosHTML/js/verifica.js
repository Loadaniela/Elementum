document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("iniciar_registro").addEventListener("click", register);
    document.getElementById("iniciar_sesion").addEventListener("click", iniciar);
    
    // Declaración de variables del archivo de login
    var contenedor_login_registro = document.querySelector(".contenedor_login_registro");
    var formulario_login = document.querySelector(".formulario_login");
    var formulario_registro = document.querySelector(".formulario_registro");
    var caja1_interior_login = document.querySelector(".caja1_interior_login");
    var caja1_interior_registro = document.querySelector(".caja1_interior_registro");

    // Funciones del login
    function iniciar() {
        formulario_registro.style.display = "none";
        contenedor_login_registro.style.left = "10px";
        formulario_login.style.display = "block";
        caja1_interior_registro.style.opacity = "1";
        caja1_interior_login.style.opacity = "0";
    }

    function register() {
        formulario_registro.style.display = "block";
        contenedor_login_registro.style.left = "410px";
        formulario_login.style.display = "none";
        caja1_interior_registro.style.opacity = "0";
        caja1_interior_login.style.opacity = "1";
    }
});
