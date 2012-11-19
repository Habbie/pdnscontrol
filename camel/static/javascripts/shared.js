
function server_start_stop_restart(server, action) {
  var action_title_list = {restart: 'Restart', stop: 'Shutdown', start: 'Start'};
  var action_title = action_title_list[action];
  var html = '<h3>'+action_title+' '+server.type+' on '+server.name+'</h3>';
  html += '<div class="row output"></div>';
  html += '<div class="row">';
  html += '<div class="six columns"></div>';
  html += '<div class="two columns"><input type=button class="small cancel button" value="Cancel"></div>';
  html += '<div class="two columns right"><input type=button class="small success button" value="'+action_title+'"></div>';
  html += '<div class="two columns spinner"></div>';
  html += '</div>';

  var modal = get_modal();
  modal.append(html);

  modal.find('input.success').click(function() {
    var spinner = modal.find('.spinner').spin('small');
    $.getJSON(server.url+action, function(result) {
      if (result.success) {
        modal.find('.output').
          empty().
          append("<label>Success:</label>").
          append($('<pre>').text(result.output));
        modal.find('input.cancel').remove();
        modal.find('input.success').
          val('Close').
          unbind('click').
          click(function() {
            modal.trigger('reveal:close');
          });
      } else {
        modal.find('.output').
          empty().
          append("<label class=error>"+action_title+" failed:</label>").
          append($('<pre>').text(result.output));
      }
      spinner.html('');
    });
    return false; // cancel close
  });

  modal.reveal({
    open: function() {
      modal.find('input.cancel').click(function() {
        modal.trigger('reveal:close');
      });
    }
  });
}

function get_modal() {
  var modal = $('#actionModal');
  if (modal.length == 0) {
    var html = '<div id="actionModal" class="reveal-modal medium"></div>';
    $('body').append(html);
    modal = $('#actionModal');
  }
  modal.html('<a class="close-reveal-modal">&#215;</a>');
  return modal;
}

function doLogShow(server, query) {
  $('#holder').html('<table id="logTable"></table>');
  $('#logModal').reveal();
  $.getJSON(
    server.url+"log-grep?needle="+query,
    function(data) {
      console.log(data);
      $('#logTable').dataTable({
        aaData: data.content,
        bSort: false,
        aoColumns: [{sTitle: "Line"}]
      });
      $('#logTable').dataTable().fnAdjustColumnSizing();
    }
  );
  return false;
}

function doFlush(server, domain) {
  console.log("Should start the spinner now!");
  $("#flushSpinner").spin("small");
  $.getJSON(
    server.url+'flush-cache?domain='+domain,
    function(data) {
      $("#flushSpinner").html(data.content.number+" flushed");
    }
  );
  $("#flushModal").close = function() {
    $("#flushSpinner").html("");
    $("#domainToFlush").val("");
  };
  return false;
}

function build_server_common(server) {
  $('#logSearchForm').bind('submit', function() {
    return doLogShow(server, $('#logQuery').val());
  });
  $('#logModal form').bind('submit', function() {
    return doLogShow(server, $('#logQuery2').val());
  });
  
  $('#btnActionRestart').click(function() {
    server_start_stop_restart(server, 'restart');
  });
  $('#btnActionShutdown').click(function() {
    server_start_stop_restart(server, 'stop');
  });

  $('#btnActionFlushCache').click(function() {
    $('#flushModal form').bind('submit', function() {
      return doFlush(server, $('#domainToFlush').val());
    });
    $('#flushModal input.success').click(function() {
      return doFlush(server, $('#domainToFlush').val());
    });
    $('#flushModal').reveal({
      close: function() {
        $('#flushSpinner').html('');
        },
      open: function() {
        $('#domainToFlush').focus();
        }
    });
  });

  $.getJSON(server.url+'stats', function(data) {
    if (server.type === 'Authoritative') {
      // recursor has this in config
      $("#version").html(data["version"]);
    }

    moment.lang('en');
    var startup = moment().subtract('seconds', data["uptime"]);
    $("#uptime").html(startup.format('LLLL') + " ("+startup.fromNow()+")");

    var flat = _.pairs(data);
    $("#statistics").dataTable({
      aaData: flat,
      iDisplayLength: 50,
      aoColumns: [
        {sTitle: "Variable"},
        {sTitle: "Value"}
      ]
    });
  });

  $.getJSON(server.url+'config', function(data) {
    var flat;

    if (server.type === 'Authoritative') {
      flat = data.config;
    } else {
      flat = _.pairs(data);
      // auth has this in stats
      $("#version").html(data["version-string"].split(" ")[2]);
    }

    $("#config").dataTable({
      aaData: flat,
      iDisplayLength: 50,
      aoColumns: [
        {sTitle: "Variable"},
        {sTitle: "Value"}
        ]
    });
  });

}

function build_graph_url(source, targets, opts) {

  var url = Config.graphite_server + '?width=686&height=308&_salt=1352972312.281';
  opts = _.defaults(opts || {}, Config.graphite_default_opts);

  url = _.reduce(_.pairs(opts), function(memo, pair) {
    return memo + '&' + pair[0] + '=' + encodeURIComponent(pair[1]);
  }, url);

  url = _.reduce(targets, function(memo, target) {
    return memo + '&target=' + encodeURIComponent(target.replace(/%SOURCE%/g, source));
  }, url);

  return url;
}
