# modificaciones a wcs tracker

estas modificaciones se dividiran en 4.

## MODULO 2 -־modificacion al ya funcional WCS OPERATIONS TERMINAL
1. acortar la barra de search y poner un boton de agenda de carriers. esta agenda va a tener toda la info de los carriers aereos, maritimos o terrestres. tiene que visualizarse y con boton para poder editar o agregar en caso de cambios de telefono, email etc o agregados nuevos. a la agenda hay que agregarle el prefix o scac, asi se puede cruzar con los embarques
2. en cada embarque donde esta identificado el carrier por su prefix o scac, debe poderse hacer clic en el carrier y que se haga un dropdown con los datos de contacto del carrier para llamar o enviar correo.
3. en el update al operational timeline donde se deja el log, hay un text box mal alineado que es el cost amount, dbeen estar todos alineados.
4. en un new shipment, hay opcion de agregar un documento pdf y que se cargue toda la informacion sola, pero no funciona bien, reconoce cualquier cosa, como deberia hacerse para que identifique correctamente la info? asi se pone en las instrucciones.
5. cualquier embarque que tenga eta o etd en el dia de la fecha, marcarlo en rojo, no muy fuerte pero que se destaque de los demas, como prioridad por salir o llegar en el dia actual.
6. dejo en la carpeta un archivo con la agenda de los carriers. Airlines - Handling Agents MIA.xlsx

##  MODULO 1 -־creacion del menu de arranque con seleccion de apps
el inicio del wcs tracker, no debe ser el actual, sino que debe tener una landing page donde tenga el acceso a las apps internas, las cuales hoy van a ser 2, el operations terminal (operations tracker) y el task tracker que es el nuevo.
1. mantener el mismo estilo y estetica en todo el sitio.
2. crear la pagina de inicio con acceso al operations tracker o al task tracker. el boton de acceso debe llevar a ya funcional oepratiions tracker y al nuevo task tracker.
3. en el operations tracker y en el task tracker deben haber botones de regreso al menu principal.
4. en esta pagina inicial ademas de los botones principales, seria bueno tener un summary de ambos modulos, con kpi, informacion general y estadistica importante sobre lo que hay dentro de cada uno.

## MODULO 3 -־creacion del task tracker
1. el task creator tiene que ser escencialmente un tracker o seguimiento de tareas.
2. la idea es que se vean como lista o como tarjetas, pero lo masimportante es que tenga diferentes ordenes y agrupaciones.
3. tiene que ser super simple y visualmente super claro, para que en un vistazo se entienda todo, si se quiere mas detalle, se entra en cada una.
4. una persona carga una task, pone el titulo, la tarea que debe realizarse, quien debe realizarla, el deadline, fecha de inicio y posibilidad de subtasks.
5. es muy importante que se cambie la visual entre listas y notas tipo kanban. la vista simple debe tener todo lo basico a la vista, si queremos detalle, seria bueno verlo con un dropdown de la lista o nota, no abrir en otra ventana porque eso cansa, debe ser super rapido.
6. esteticamente seguir el mismo estilo de la webapp.
7. el orden debe ser por creacion (deben tener id), fecha de deadline
8. la agrupacion debe ser por estado, usuario.
9. las divisiones/agrupaciones, deben ser muy claras para que sea simple a la vista.
10. cada tarea debe tener un boton de copy, para que de forma clara y simple se pueda copiar y pegar en un email o whatsapp la info de la tarea a la persona que no la hizo para que avance, como recordatorio.
11. ademas de poder ordenar o agrupar, seria bueno que los deadline y su acercamiento a dicha fecha vaya cambiando de color para mostrar que esta por ponerse rojo, verde cuando aun esta lejos.

## MODULO 4 -־Este modulo es el ratesheet tracker.
este modulo basicamente es para guardar el ratesheet base de la empresa. World class solutions tiene un ratesheet en excel con todos sus servicios, como warehousing, air, ocean, bonded, FTZ, etc con todos los costos para cada caso. estos costos son para visualizar y poder hacer uso para cotizar a los clientes.
1. con el ratesheet base, siempre tiene que estar en modo visualizacion, pero debe poderse entrar y editar los costos
2. tiene que tener la misma estetica de todo el sitio de webapps.
3. tanto la visualizacion, agrupacion, orden y todo debe ser super simple y claro para que se entienda bien. el ratesheet base, debe poder editarse en toda su informacion.
4. debe tener una fucnionalidad, que cualquier concepto o varios de cualquier agrupacion, deban poderse seleccionarse todos o aleatoriamente y una vez seleccionados, hacer clic en un boton de copy y que todos vayan al clipboard con formato profesional para pegar en un correo, chat de whatsapp, etc. asi no hay que transcribir los costos.
5. se deben poder crear tarifarios paralelos para clientes siempre con al base del ratesheet base. por ejemplo si quiero el mismo tarifario pero para un cliente especifico (seria como usar un guardar como..) y ponerle el nombre del cliente y editarlo con un over del 10% por ejemplo, entonces tenemos el base y uno exclusivo para este otro cliente que tiene tarifas mas caras. las tarifas deben poderse modificar individualmente o todas juntas en masa. el aumento debe ser manual por cualquier monto, un incremento de monto fijo o porcentual. todas deben tener la opcion de la original de seleccionar y copiar para pegar externamente.
en esta carpeta pongo el archivo del tarifario en excel que hay que transladar a la app. WCS_Warehouse&Rates.xlsx